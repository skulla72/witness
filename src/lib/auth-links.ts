/** Keep callback destinations inside Witness, including backslash URL tricks. */
export function safeAuthNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f]/.test(raw)) return "/";
  return raw;
}

export const NATIVE_EMAIL_CALLBACK = "com.commonlight.witness://auth/email-confirmation";
export const NATIVE_RECOVERY_CALLBACK = "com.commonlight.witness://auth/recovery";

/** Email-only PKCE callbacks. Managed social OAuth does not use this handoff. */
export function parseNativeCallback(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "com.commonlight.witness:" || url.hostname !== "auth" ||
        !["/email-confirmation", "/recovery"].includes(url.pathname) ||
        url.username || url.password || url.port || url.hash ||
        url.searchParams.has("access_token") || url.searchParams.has("refresh_token") ||
        url.searchParams.getAll("code").length > 1) return null;
    if (!url.searchParams.get("code") && !url.searchParams.get("error")) return null;
    return {
      code: url.searchParams.get("code"),
      error: url.searchParams.get("error_description") ?? url.searchParams.get("error"),
      recovery: url.pathname === "/recovery",
    };
  } catch { return null; }
}
