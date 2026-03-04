type CacheEntry = {
  signedUrl: string;
  expiresAtMs: number;
};

const CACHE: Record<string, CacheEntry> = {};

const SKEW_MS = 5 * 60 * 1000; // renova 5 min antes

export function getCachedAvatarSignedUrl(path: string): string | null {
  const entry = CACHE[path];
  if (!entry) return null;
  if (Date.now() + SKEW_MS >= entry.expiresAtMs) return null;
  return entry.signedUrl;
}

export function setCachedAvatarSignedUrl(path: string, signedUrl: string, expiresInSeconds: number) {
  CACHE[path] = {
    signedUrl,
    expiresAtMs: Date.now() + expiresInSeconds * 1000,
  };
}
