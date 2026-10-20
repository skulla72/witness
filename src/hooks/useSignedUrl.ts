import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  configureSignedMediaTransport, publicMediaUrl, signedMediaCache, SIGNED_MEDIA_TTL, type MediaBucket,
} from "@/lib/signed-media-cache";

configureSignedMediaTransport(async (input, inputBucket) => {
  let path = input, bucket = inputBucket;
  // Old signed storage URLs are credentials, not deliberately public assets.
  // Re-sign only paths on the currently configured backend, never another host.
  if (/\/storage\/v1\/object\/sign\//i.test(input)) {
    const configured = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
    const url = new URL(input, configured);
    if (!configured || url.origin !== new URL(configured).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/sign\/(testimony-media|avatars|need-media|profile-media)\/(.+)$/);
    if (!match) return null;
    bucket = match[1] as MediaBucket;
    path = decodeURIComponent(match[2]);
  }
  if (bucket === "profile-media") {
    const { signProfileMedia } = await import("@/lib/profileMediaUrl.functions");
    return (await signProfileMedia({ data: { path } })).url;
  }
  const result = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_MEDIA_TTL);
  return result.error ? null : result.data?.signedUrl ?? null;
});

const serverSnapshot = { account: undefined, generation: 0, revision: 0 };
/** Kept for imperative callers; mounted media should use the reactive hook. */
export async function signedUrl(path: string | null | undefined, bucket: MediaBucket = "testimony-media") {
  if (publicMediaUrl(path)) return publicMediaUrl(path);
  if (typeof window === "undefined") return null;
  void supabase.auth; // Starts the existing client's initial-session subscription.
  return signedMediaCache.load(path, bucket);
}

export function useSignedUrl(path: string | null | undefined, bucket: MediaBucket = "testimony-media") {
  const snapshot = useSyncExternalStore(signedMediaCache.subscribe, signedMediaCache.getSnapshot, () => serverSnapshot);
  const [publicFailure, setPublicFailure] = useState<string | null>(null);
  const direct = publicMediaUrl(path);
  // Derive the URL from the CURRENT identity/cache/clock on every render. Never
  // initialize component state with a bearer link from the preceding identity.
  const state = signedMediaCache.read(path, bucket);
  useEffect(() => {
    void supabase.auth;
    if (state.loading && snapshot.account !== undefined) void signedMediaCache.load(path, bucket);
  }, [path, bucket, snapshot.generation, snapshot.account, state.loading]);
  const generation = snapshot.generation;
  return {
    ...state,
    ...(direct && publicFailure === direct ? { url: null, loading: false, error: true } : {}),
    isCurrent: () => signedMediaCache.getSnapshot().generation === generation,
    retry: () => {
      if (signedMediaCache.getSnapshot().generation !== generation) return;
      if (direct) { setPublicFailure(null); return; }
      signedMediaCache.invalidate(path, bucket);
      void signedMediaCache.load(path, bucket);
    },
    onError: () => {
      if (signedMediaCache.getSnapshot().generation !== generation) return;
      if (direct) setPublicFailure(direct);
      else signedMediaCache.fail(path, bucket);
    },
  };
}
