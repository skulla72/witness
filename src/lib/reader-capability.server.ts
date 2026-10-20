/** A public/user credential must never make an RLS-filtered empty result "peer".
 * This checks credential kind only. The API must still authenticate the request;
 * a matching shape is not a connection/signing verification. Never log values.
 */
export function hasPrivilegedReaderShape(value: string | undefined): boolean {
  if (!value) return false;
  if (value.startsWith("sb_secret_")) return true;
  try {
    const parts = value.split(".");
    if (parts.length !== 3) return false;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))?.role === "service_role";
  } catch { return false; }
}

export function requireExistingPrivilegedReader() {
  if (!hasPrivilegedReaderShape(process.env.SUPABASE_SERVICE_ROLE_KEY))
    throw new Error("The existing privileged server runtime is unavailable. Public/user RLS credentials cannot establish room classification.");
}
