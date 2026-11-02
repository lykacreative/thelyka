// Only same-site paths: "/admin" is fine, "//evil.com", "/\evil.com" and paths with control characters are not.
export function safeNextPath(value: string | null | undefined, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  return value;
}
