import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();
const TTL = 5 * 60; // seconds — short so access ends soon after membership does

type Bucket = "testimony-media" | "avatars" | "need-media" | "profile-media";

/** Resolve a private storage path to a short-lived signed URL. Absolute URLs pass through. */
export async function signedUrl(path: string | null | undefined, bucket: Bucket = "testimony-media"): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  const key = `${bucket}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now() + 30_000) return hit.url;
  let data: { signedUrl: string } | null = null;
  if (bucket === "profile-media") {
    const { signProfileMedia } = await import("@/lib/profileMediaUrl.functions");
    const res = await signProfileMedia({ data: { path } }).catch(() => ({ url: null }));
    data = res.url ? { signedUrl: res.url } : null;
  } else {
    const r = await supabase.storage.from(bucket).createSignedUrl(path, TTL);
    data = r.error ? null : r.data;
  }
  if (!data?.signedUrl) return null;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + TTL * 1000 });
  return data.signedUrl;
}

export function useSignedUrl(path: string | null | undefined, bucket: Bucket = "testimony-media") {
  const direct = path && /^(https?:|data:|blob:|\/)/.test(path) ? path : null;
  const [url, setUrl] = useState<string | null>(() => direct || (path && cache.get(`${bucket}:${path}`)?.url) || null);
  const [loading, setLoading] = useState(Boolean(path) && !url);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); setLoading(false); return; }
    setLoading(true);
    signedUrl(path, bucket).then(u => { if (alive) { setUrl(u); setLoading(false); } });
    return () => { alive = false; };
  }, [path, bucket]);
  return { url, loading };
}
