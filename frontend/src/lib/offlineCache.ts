// offlineCache.ts
// LocalStorage fallback layer.
// Components never call this directly — the api/ layer calls it
// to persist mock data and cache last-known API responses.

const PREFIX = 'transitops:';

function wrap<T>(data: T) {
  return JSON.stringify({ data, ts: Date.now() });
}

function unwrap<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, wrap(data));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    return unwrap<T>(localStorage.getItem(PREFIX + key));
  } catch {
    return null;
  }
}

export function sessionSet<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(PREFIX + key, wrap(data));
  } catch {}
}

export function sessionGet<T>(key: string): T | null {
  try {
    return unwrap<T>(sessionStorage.getItem(PREFIX + key));
  } catch {
    return null;
  }
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

export function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {}
}

export function cacheClear(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
