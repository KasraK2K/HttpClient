import type {
  ContentKind,
  ExecuteRequestPayload,
  ExecuteRequestResult,
  FormValueRow,
  HeaderRow,
  QueryParamRow,
} from "@restify/shared";
import {
  assertAllowedOutboundUrl,
  type OutboundRequestPolicy,
} from "./outbound-request-policy.js";

function applyEnabledKeyValues(target: Headers, rows: HeaderRow[]): void {
  rows
    .filter((row) => row.enabled && row.key.trim())
    .forEach((row) => target.set(row.key, row.value));
}

function applyParams(url: URL, params: QueryParamRow[]): void {
  params
    .filter((param) => param.enabled && param.key.trim())
    .forEach((param) => url.searchParams.set(param.key, param.value));
}

function appendMultipartFormValues(target: FormData, rows: FormValueRow[]): FormData {
  rows
    .filter((row) => row.enabled && row.key.trim())
    .forEach((row) => {
      if (row.valueKind === "file") {
        if (!row.fileContentBase64) {
          return;
        }

        const blob = new Blob(
          [Buffer.from(row.fileContentBase64, "base64")],
          {
            type: row.fileContentType || "application/octet-stream",
          },
        );

        target.append(row.key, blob, row.fileName || "file");
        return;
      }

      target.append(row.key, row.value);
    });

  return target;
}

function appendUrlEncodedValues(
  target: URLSearchParams,
  rows: FormValueRow[],
): URLSearchParams {
  rows
    .filter((row) => row.enabled && row.key.trim())
    .forEach((row) => target.append(row.key, row.value));

  return target;
}

function detectContentKind(contentType: string): ContentKind {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("application/json")) {
    return "json";
  }
  if (normalized.includes("text/html")) {
    return "html";
  }
  if (
    normalized.includes("application/xml") ||
    normalized.includes("text/xml")
  ) {
    return "xml";
  }
  if (normalized.startsWith("image/")) {
    return "image";
  }
  if (normalized.startsWith("text/")) {
    return "text";
  }
  return "binary";
}

function buildBody(
  payload: ExecuteRequestPayload,
  headers: Headers,
): BodyInit | undefined {
  switch (payload.body.type) {
    case "none":
      return undefined;
    case "json": {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      return payload.body.content ?? "";
    }
    case "text":
      return payload.body.content ?? "";
    case "form-data":
      return appendMultipartFormValues(new FormData(), payload.body.values ?? []);
    case "x-www-form-urlencoded":
      if (!headers.has("content-type")) {
        headers.set(
          "content-type",
          "application/x-www-form-urlencoded;charset=UTF-8",
        );
      }
      return appendUrlEncodedValues(
        new URLSearchParams(),
        payload.body.values ?? [],
      ).toString();
    default:
      return undefined;
  }
}

export async function executeHttpRequest(
  payload: ExecuteRequestPayload,
  policy: OutboundRequestPolicy,
  signal?: AbortSignal,
): Promise<ExecuteRequestResult> {
  await assertAllowedOutboundUrl(payload.url, policy);
  const url = new URL(payload.url);
  const headers = new Headers();
  applyEnabledKeyValues(headers, payload.headers);
  applyParams(url, payload.params);

  if (payload.auth.type === "bearer" && payload.auth.token) {
    headers.set("authorization", `Bearer ${payload.auth.token}`);
  }

  if (payload.auth.type === "basic" && payload.auth.username) {
    const token = Buffer.from(
      `${payload.auth.username}:${payload.auth.password ?? ""}`,
    ).toString("base64");
    headers.set("authorization", `Basic ${token}`);
  }

  const body = buildBody(payload, headers);
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: payload.method,
    headers,
    body,
    redirect: "manual",
    signal,
  });
  const durationMs = Math.round(performance.now() - startedAt);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const contentKind = detectContentKind(contentType);
  const headerEntries = Object.fromEntries(response.headers.entries());
  const setCookie =
    (
      response.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie?.() ?? [];
  const cookies = setCookie.map((cookie) => {
    const [pair] = cookie.split(";");
    const [name, value] = pair.split("=");
    return { name, value: value ?? "", raw: cookie };
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: headerEntries,
    cookies,
    durationMs,
    sizeBytes: buffer.byteLength,
    contentType,
    contentKind,
    ...(contentKind === "binary" || contentKind === "image"
      ? { base64Body: buffer.toString("base64") }
      : { textBody: buffer.toString("utf8") }),
  };
}
