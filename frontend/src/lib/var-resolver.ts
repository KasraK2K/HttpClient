import type {
  ExecuteRequestPayload,
  FormValueRow,
  HeaderRow,
  ProjectEnvVar,
  QueryParamRow,
  RequestAuthConfig,
  RequestBodyConfig,
  RequestDoc,
} from "@restify/shared";
import type { VariableResolution } from "../types";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

type RequestKeyValueRow = HeaderRow | QueryParamRow | FormValueRow;

export function extractVariableNames(input: string): string[] {
  const matches = [...input.matchAll(VARIABLE_PATTERN)];
  return [...new Set(matches.map((match) => match[1]))];
}

export function resolveVariables(
  input: string,
  envVars: ProjectEnvVar[],
): VariableResolution {
  const map = new Map(envVars.map((envVar) => [envVar.key, envVar.value]));
  const resolved: string[] = [];
  const unresolved: string[] = [];

  const output = input.replace(VARIABLE_PATTERN, (_, variableName: string) => {
    if (map.has(variableName)) {
      resolved.push(variableName);
      return map.get(variableName) ?? "";
    }

    unresolved.push(variableName);
    return `{{${variableName}}}`;
  });

  return {
    output,
    resolved: [...new Set(resolved)],
    unresolved: [...new Set(unresolved)],
  };
}

export function resolveKeyValueRows<T extends RequestKeyValueRow>(
  rows: T[],
  envVars: ProjectEnvVar[],
): T[] {
  return rows.map(
    (row) =>
      ({
        ...row,
        key: resolveVariables(row.key, envVars).output,
        value: resolveVariables(row.value, envVars).output,
      }) as T,
  );
}

export function resolveRequestBody(
  body: RequestBodyConfig,
  envVars: ProjectEnvVar[],
): RequestBodyConfig {
  if (body.type === "json" || body.type === "text") {
    return {
      ...body,
      content: resolveVariables(body.content ?? "", envVars).output,
    };
  }

  return {
    ...body,
    values: resolveKeyValueRows(body.values ?? [], envVars),
  };
}

export function resolveRequestAuth(
  auth: RequestAuthConfig,
  envVars: ProjectEnvVar[],
): RequestAuthConfig {
  if (auth.type === "bearer") {
    return {
      ...auth,
      token: resolveVariables(auth.token ?? "", envVars).output,
    };
  }

  if (auth.type === "basic") {
    return {
      ...auth,
      username: resolveVariables(auth.username ?? "", envVars).output,
      password: resolveVariables(auth.password ?? "", envVars).output,
    };
  }

  return auth;
}

export function buildExecuteRequestPayload(
  draft: RequestDoc,
  envVars: ProjectEnvVar[],
): ExecuteRequestPayload {
  const resolvedParams = resolveKeyValueRows(draft.params, envVars);
  const resolvedUrl = mergeParamsIntoUrl(
    resolveVariables(draft.url, envVars).output,
    resolvedParams,
  );

  return {
    workspaceId: draft.workspaceId,
    projectId: draft.projectId,
    requestId: draft._id,
    method: draft.method,
    url: resolvedUrl,
    headers: resolveKeyValueRows(draft.headers, envVars),
    params: resolvedParams,
    body: resolveRequestBody(draft.body, envVars),
    auth: resolveRequestAuth(draft.auth, envVars),
  };
}

export function buildParamsFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return [...parsed.searchParams.entries()].map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    }));
  } catch {
    return [];
  }
}

export function mergeParamsIntoUrl(
  url: string,
  params: Array<{ key: string; value: string; enabled: boolean }>,
) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    params
      .filter((param) => param.enabled && param.key.trim())
      .forEach((param) => parsed.searchParams.append(param.key, param.value));
    return parsed.toString();
  } catch {
    return url;
  }
}
