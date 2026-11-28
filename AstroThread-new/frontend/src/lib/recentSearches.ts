import { useEffect, useState } from "react";
import { getCurrentSession } from "../data/demoAuth";
import { recordSearch } from "../data/myThread";
import { apiBaseUrl, searchSource } from "../services/search/searchService";

const STORAGE_KEY = "astrothread:recent-searches";
export const MAX_RECENT_SEARCHES = 5;

const USES_BACKEND = searchSource === "api";

function keyFor(email: string | null | undefined): string {
  return email ? `${STORAGE_KEY}:${email.trim().toLowerCase()}` : STORAGE_KEY;
}

function storageKey(): string {
  return keyFor(getCurrentSession()?.email);
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
    .slice(0, MAX_RECENT_SEARCHES);
}

function readSearches(key = storageKey()): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? cleanList(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeSearches(searches: string[], key = storageKey()) {
  try {
    window.localStorage.setItem(key, JSON.stringify(searches));
  } catch {
  }
}

function isSameQuery(a: string, b: string) {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

function sendToServer(method: "POST" | "DELETE", path: string, body?: unknown) {
  if (!USES_BACKEND || !getCurrentSession()) {
    return;
  }

  fetch(`${apiBaseUrl}/recent-searches${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        console.warn(`Recent search wasn't saved on the server (status ${response.status}).`);
      }
    })
    .catch(() => {
      console.warn("Recent search wasn't saved: the server can't be reached.");
    });
}

export async function syncRecentSearches(
  email: string | null | undefined,
  signal?: AbortSignal,
): Promise<string[] | null> {
  if (!USES_BACKEND || !email) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/recent-searches`, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    const searches = cleanList(
      data && typeof data === "object" ? (data as { searches?: unknown }).searches : null,
    );

    writeSearches(searches, keyFor(email));
    return searches;
  } catch {
    return null;
  }
}

export function getRecentSearches(): string[] {
  return readSearches();
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  const current = readSearches();

  if (!trimmed) {
    return current;
  }

  const next = [
    trimmed,
    ...current.filter((item) => !isSameQuery(item, trimmed)),
  ].slice(0, MAX_RECENT_SEARCHES);

  writeSearches(next);
  sendToServer("POST", "", { query: trimmed });

  const session = getCurrentSession();

  if (session) {
    recordSearch(session.email, trimmed);
  }

  return next;
}

export function removeRecentSearch(query: string): string[] {
  const next = readSearches().filter((item) => !isSameQuery(item, query));
  writeSearches(next);
  sendToServer("DELETE", `/${encodeURIComponent(query.trim())}`);
  return next;
}

export function clearRecentSearches(): string[] {
  try {
    window.localStorage.removeItem(storageKey());
  } catch {
  }

  sendToServer("DELETE", "");
  return [];
}

export function useRecentSearches() {
  const email = getCurrentSession()?.email ?? null;
  const key = keyFor(email);
  const [saved, setSaved] = useState(() => ({ key, searches: readSearches(key) }));
  const searches = saved.key === key ? saved.searches : readSearches(key);

  useEffect(() => {
    if (!email) {
      return;
    }

    const controller = new AbortController();

    syncRecentSearches(email, controller.signal).then((fromServer) => {
      if (!controller.signal.aborted && fromServer) {
        setSaved({ key: keyFor(email), searches: fromServer });
      }
    });

    return () => controller.abort();
  }, [email]);

  return {
    searches,
    add: (query: string) => setSaved({ key: storageKey(), searches: addRecentSearch(query) }),
    remove: (query: string) => setSaved({ key: storageKey(), searches: removeRecentSearch(query) }),
    clear: () => setSaved({ key: storageKey(), searches: clearRecentSearches() }),
  };
}
