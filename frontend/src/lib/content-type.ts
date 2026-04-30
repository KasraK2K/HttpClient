import type { ContentKind } from "@reqloom/shared";

export function detectContentKind(contentType: string): ContentKind {
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
