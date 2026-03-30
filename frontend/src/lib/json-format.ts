export function formatJsonContent(content: string) {
  return JSON.stringify(JSON.parse(content), null, 2);
}
