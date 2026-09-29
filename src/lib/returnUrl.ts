/**
 * Only our own sites may be used as the place a payment or setup page sends
 * people back to. Anything else is rejected on the server.
 */
const ALLOWED_HOSTS = new Set(["witnessmovement.com", "www.witnessmovement.com", "localhost"]);

export function assertReturnUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2000) throw new Error("Invalid return address");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("Invalid return address");
  }
  const host = u.hostname.toLowerCase();
  const ok =
    ALLOWED_HOSTS.has(host) ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  const proto = u.protocol === "https:" || (host === "localhost" && u.protocol === "http:");
  if (!ok || !proto || u.username || u.password) throw new Error("Invalid return address");
  return u.toString();
}
