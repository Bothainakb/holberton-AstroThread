import { useSyncExternalStore } from "react";

const STORAGE_PREFIX = "astrothread-path-reads:";
const EMPTY: ReadonlySet<string> = new Set();

const cache = new Map<string, ReadonlySet<string>>();
const listeners = new Set<() => void>();

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function load(email: string): ReadonlySet<string> {
  const cached = cache.get(email);

  if (cached) {
    return cached;
  }

  let ids: string[] = [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(email)) ?? "[]");

    if (Array.isArray(parsed)) {
      ids = parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {
  }

  const reads = new Set(ids);
  cache.set(email, reads);
  return reads;
}

function save(email: string, reads: ReadonlySet<string>) {
  cache.set(email, reads);

  try {
    window.localStorage.setItem(storageKey(email), JSON.stringify([...reads]));
  } catch {
  }

  listeners.forEach((listener) => listener());
}

export function getPathReads(email: string): ReadonlySet<string> {
  return load(email);
}

export function setPathRead(email: string, paperId: string, read: boolean) {
  const current = load(email);

  if (current.has(paperId) === read) {
    return;
  }

  const next = new Set(current);

  if (read) {
    next.add(paperId);
  } else {
    next.delete(paperId);
  }

  save(email, next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePathReads(email: string | null | undefined): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => (email ? load(email) : EMPTY));
}
