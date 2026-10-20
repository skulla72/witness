export type MediaBucket = "testimony-media" | "avatars" | "need-media" | "profile-media";
export const SIGNED_MEDIA_TTL = 300;
const REFRESH_MARGIN = 30_000;

/** Deliberately public assets bypass signing, but storage bearer links do not. */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path || /\/storage\/v1\/object\/sign\//i.test(path)) return null;
  return /^(https?:|data:|blob:|\/)/.test(path) ? path : null;
}

type Entry = {
  status: "loading" | "ready" | "error";
  url: string | null;
  expires: number;
  promise?: Promise<string | null>;
  cancelExpiry?: () => void;
};
type Snapshot = { account: string | null | undefined; generation: number; revision: number };
type Options = {
  now?: () => number;
  schedule?: (run: () => void, delay: number) => () => void;
};

/** Browser-memory cache only. Identity changes invalidate both entries and work. */
export class SignedMediaCache {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = { account: undefined, generation: 0, revision: 0 };
  private now: () => number;
  private schedule: NonNullable<Options["schedule"]>;

  constructor(
    private sign: (path: string, bucket: MediaBucket) => Promise<string | null>,
    options: Options = {},
  ) {
    this.now = options.now ?? Date.now;
    this.schedule = options.schedule ?? ((run, delay) => {
      const timer = setTimeout(run, delay);
      return () => clearTimeout(timer);
    });
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private emit() {
    this.snapshot = { ...this.snapshot, revision: this.snapshot.revision + 1 };
    for (const listener of this.listeners) listener();
  }
  setAccount(account: string | null, force = false) {
    if (!force && this.snapshot.account === account) return;
    for (const entry of this.entries.values()) entry.cancelExpiry?.();
    this.entries.clear();
    this.snapshot = { account, generation: this.snapshot.generation + 1, revision: this.snapshot.revision };
    this.emit();
  }
  private key(path: string, bucket: MediaBucket) {
    return JSON.stringify([this.snapshot.account, bucket, path]);
  }
  read(path: string | null | undefined, bucket: MediaBucket) {
    const direct = publicMediaUrl(path);
    if (direct) return { url: direct, loading: false, error: false };
    if (!path) return { url: null, loading: false, error: false };
    // No private media until the initial auth identity is known.
    if (this.snapshot.account === undefined) return { url: null, loading: true, error: false };
    const entry = this.entries.get(this.key(path, bucket));
    const valid = entry?.status === "ready" && entry.expires > this.now() + REFRESH_MARGIN;
    return {
      url: valid ? entry.url : null,
      loading: !entry || entry.status === "loading" || (entry.status === "ready" && !valid),
      error: entry?.status === "error",
    };
  }
  async load(path: string | null | undefined, bucket: MediaBucket): Promise<string | null> {
    const direct = publicMediaUrl(path);
    if (direct || !path) return direct;
    if (this.snapshot.account === undefined) return null;
    const key = this.key(path, bucket);
    const previous = this.entries.get(key);
    const current = this.read(path, bucket);
    if (current.url || current.error) return current.url;
    if (previous?.status === "loading") return previous.promise ?? null;
    previous?.cancelExpiry?.();
    const generation = this.snapshot.generation;
    const entry: Entry = { status: "loading", url: null, expires: this.now() + SIGNED_MEDIA_TTL * 1000 };
    this.entries.set(key, entry);
    // A microtask ensures the pending promise is installed before observers run.
    entry.promise = Promise.resolve().then(() => this.sign(path, bucket)).then(url => {
      if (generation !== this.snapshot.generation || this.entries.get(key) !== entry) return null;
      if (!url || entry.expires <= this.now() + REFRESH_MARGIN) {
        entry.status = "error";
        entry.url = null;
      } else {
        entry.status = "ready";
        entry.url = url;
        entry.cancelExpiry = this.schedule(() => {
          if (this.entries.get(key) !== entry) return;
          this.entries.delete(key);
          this.emit();
        }, entry.expires - this.now() - REFRESH_MARGIN);
      }
      this.emit();
      return entry.url;
    }).catch(() => {
      if (generation !== this.snapshot.generation || this.entries.get(key) !== entry) return null;
      entry.status = "error";
      entry.url = null;
      this.emit();
      return null;
    });
    this.emit();
    return entry.promise;
  }
  invalidate(path: string | null | undefined, bucket: MediaBucket) {
    if (!path || publicMediaUrl(path)) return;
    const key = this.key(path, bucket);
    this.entries.get(key)?.cancelExpiry?.();
    this.entries.delete(key);
    this.emit();
  }
  fail(path: string | null | undefined, bucket: MediaBucket) {
    if (!path || publicMediaUrl(path)) return;
    const key = this.key(path, bucket);
    this.entries.get(key)?.cancelExpiry?.();
    this.entries.set(key, { status: "error", url: null, expires: 0 });
    this.emit();
  }
}

// Transport is provided by the hook adapter; this module never creates an auth
// client. That lets the existing client's auth events reset media synchronously.
let transport: (path: string, bucket: MediaBucket) => Promise<string | null> = async () => null;
export const signedMediaCache = new SignedMediaCache((path, bucket) => transport(path, bucket));
export function configureSignedMediaTransport(sign: typeof transport) { transport = sign; }
