export function extractApiErrorMessage(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof Error) {
    return extractApiErrorMessage(error.message) ?? fallback;
  }

  if (typeof error === "string") {
    return extractApiErrorMessage(error) ?? fallback;
  }

  return fallback;
}
