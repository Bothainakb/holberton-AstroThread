import { useState } from "react";
import { getCurrentSession } from "../data/demoAuth";
import { recordSearch } from "../data/myThread";

const STORAGE_KEY = "astrothread:recent-searches";
export const MAX_RECENT_SEARCHES = 5;

function readSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function writeSearches(searches: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
  }
}

function isSameQuery(a: string, b: string) {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
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

  const session = getCurrentSession();

  if (session) {
    recordSearch(session.email, trimmed);
  }

  return next;
}

export function removeRecentSearch(query: string): string[] {
  const next = readSearches().filter((item) => !isSameQuery(item, query));
  writeSearches(next);
  return next;
}

export function clearRecentSearches(): string[] {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
  }

  return [];
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>(getRecentSearches);

  return {
    searches,
    add: (query: string) => setSearches(addRecentSearch(query)),
    remove: (query: string) => setSearches(removeRecentSearch(query)),
    clear: () => setSearches(clearRecentSearches()),
  };
}