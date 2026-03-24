import type { ProjectEnvVar } from "@restify/shared";
import type { VariableResolution } from "../types";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

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
