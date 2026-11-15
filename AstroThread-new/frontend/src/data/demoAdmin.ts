export type PaperStatus = "visible" | "hidden";
export type AccountStatus = "active" | "suspended";

interface AdminState {
  hiddenPaperIds: string[];
  deletedPaperIds: string[];
  suspendedEmails: string[];
}

export interface SearchCount {
  query: string;
  count: number;
}

export interface RecentSearch {
  query: string;
  at: string;
}

export interface SearchActivity {
  total: number;
  top: SearchCount[];
  recent: RecentSearch[];
}

const STORAGE_KEY = "astrothread-demo-admin";
const MY_THREAD_PREFIX = "astrothread-my-thread:";
const TOP_SEARCH_LIMIT = 5;
const RECENT_SEARCH_LIMIT = 10;

const EMPTY_STATE: AdminState = { hiddenPaperIds: [], deletedPaperIds: [], suspendedEmails: [] };

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readState(): AdminState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === "object") {
      const data = parsed as Partial<Record<keyof AdminState, unknown>>;
      return {
        hiddenPaperIds: toStringList(data.hiddenPaperIds),
        deletedPaperIds: toStringList(data.deletedPaperIds),
        suspendedEmails: toStringList(data.suspendedEmails),
      };
    }
  } catch {
  }

  return EMPTY_STATE;
}

function writeState(state: AdminState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getPaperStatus(id: string): PaperStatus {
  return readState().hiddenPaperIds.includes(id) ? "hidden" : "visible";
}

export function isPaperDeleted(id: string): boolean {
  return readState().deletedPaperIds.includes(id);
}

// Hidden and deleted papers are left out of search, paper pages and related papers.
export function isPaperUnavailable(id: string): boolean {
  const state = readState();
  return state.hiddenPaperIds.includes(id) || state.deletedPaperIds.includes(id);
}

export function setPaperStatus(id: string, status: PaperStatus) {
  const state = readState();
  const others = state.hiddenPaperIds.filter((item) => item !== id);

  writeState({
    ...state,
    hiddenPaperIds: status === "hidden" ? [...others, id] : others,
  });
}

export function deletePaper(id: string) {
  const state = readState();

  writeState({
    ...state,
    hiddenPaperIds: state.hiddenPaperIds.filter((item) => item !== id),
    deletedPaperIds: [...state.deletedPaperIds.filter((item) => item !== id), id],
  });
}

export function isAccountSuspended(email: string): boolean {
  return readState().suspendedEmails.includes(normalizeEmail(email));
}

export function setAccountStatus(email: string, status: AccountStatus) {
  const state = readState();
  const normalized = normalizeEmail(email);
  const others = state.suspendedEmails.filter((item) => item !== normalized);

  writeState({
    ...state,
    suspendedEmails: status === "suspended" ? [...others, normalized] : others,
  });
}

export function getSearchActivity(): SearchActivity {
  const searches: RecentSearch[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(MY_THREAD_PREFIX)) {
        continue;
      }

      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
      const journey =
        parsed && typeof parsed === "object" && Array.isArray((parsed as { journey?: unknown }).journey)
          ? ((parsed as { journey: unknown[] }).journey)
          : [];

      journey.forEach((step) => {
        if (
          step &&
          typeof step === "object" &&
          (step as { type?: unknown }).type === "search" &&
          typeof (step as { query?: unknown }).query === "string" &&
          typeof (step as { at?: unknown }).at === "string"
        ) {
          const { query, at } = step as { query: string; at: string };
          searches.push({ query: query.trim(), at });
        }
      });
    }
  } catch {
  }

  const counts = new Map<string, SearchCount>();

  searches.forEach(({ query }) => {
    const key = query.toLowerCase();
    const current = counts.get(key);
    counts.set(key, { query: current?.query ?? query, count: (current?.count ?? 0) + 1 });
  });

  return {
    total: searches.length,
    top: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, TOP_SEARCH_LIMIT),
    recent: [...searches].sort((a, b) => b.at.localeCompare(a.at)).slice(0, RECENT_SEARCH_LIMIT),
  };
}

export function resetAdminDemo() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}