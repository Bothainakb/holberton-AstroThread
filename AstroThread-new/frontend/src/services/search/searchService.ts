import type { PaperSummary, PaperType } from "../../types/research";

export type SearchSource = "sample" | "api";

export interface SearchResponse {
  papers: PaperSummary[];
  source: SearchSource;
}

const SAMPLE_DELAY_MS = 600;

export const searchSource: SearchSource =
  import.meta.env.VITE_SEARCH_SOURCE === "api" ? "api" : "sample";

const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "in", "on", "and", "or", "for", "to",
  "with", "from", "about", "what", "is", "are", "how", "why", "do", "does",
]);

const MIN_PARTIAL_LENGTH = 3;

interface FieldWeight {
  text: string;
  weight: number;
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function toSearchTerm(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }

  return word;
}

export function getSearchTerms(query: string): string[] {
  const terms = normalizeSearchText(query)
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word))
    .map(toSearchTerm);

  return [...new Set(terms)];
}

function fieldContainsTerm(field: string, term: string): boolean {
  if (term.length >= MIN_PARTIAL_LENGTH) {
    return field.includes(term);
  }

  return ` ${field}`.includes(` ${term}`);
}

function getSearchableFields(paper: PaperSummary): FieldWeight[] {
  return [
    { text: normalizeSearchText(paper.title), weight: 6 },
    { text: normalizeSearchText(paper.keywords.join(" ")), weight: 5 },
    { text: normalizeSearchText(paper.topic), weight: 4 },
    { text: normalizeSearchText(paper.authors.join(" ")), weight: 4 },
    { text: normalizeSearchText(paper.abstract), weight: 3 },
  ];
}

interface PaperMatch {
  paper: PaperSummary;
  matchedTerms: number;
  score: number;
}

function matchPaper(
  paper: PaperSummary,
  terms: string[],
  phrase: string,
): PaperMatch {
  const fields = getSearchableFields(paper);
  let matchedTerms = 0;
  let score = 0;

  for (const term of terms) {
    const weights = fields
      .filter((field) => fieldContainsTerm(field.text, term))
      .map((field) => field.weight);

    if (weights.length > 0) {
      matchedTerms += 1;
      score += Math.max(...weights);
    }
  }

  if (terms.length > 1 && fields.some((field) => field.text.includes(phrase))) {
    score += 10;
  }

  return { paper, matchedTerms, score };
}

export function rankPapers(
  papers: readonly PaperSummary[],
  query: string,
): PaperSummary[] {
  const terms = getSearchTerms(query);

  if (terms.length === 0) {
    return [];
  }

  const phrase = normalizeSearchText(query);
  const matches = papers
    .map((paper) => matchPaper(paper, terms, phrase))
    .filter((match) => match.matchedTerms > 0);
  const fullMatches = matches.filter((match) => match.matchedTerms === terms.length);
  const ranked = fullMatches.length > 0 ? fullMatches : matches;

  return ranked
    .sort((a, b) => b.matchedTerms - a.matchedTerms || b.score - a.score)
    .map((match) => match.paper);
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);

    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Search cancelled", "AbortError"));
    });
  });
}

async function searchSamplePapers(
  query: string,
  signal: AbortSignal,
): Promise<PaperSummary[]> {
  const { samplePapers } = await import("./sampleSearchData");
  await wait(SAMPLE_DELAY_MS, signal);

  return rankPapers(samplePapers, query);
}

function toPaperType(value: unknown): PaperType {
  return value === "theoretical" ? "theoretical" : "observational";
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toPaperSummary(item: Record<string, unknown>): PaperSummary {
  return {
    id: String(item.id ?? ""),
    title: String(item.title ?? "Untitled paper"),
    authors: toStringList(item.authors),
    year: Number(item.year) || 0,
    venue: String(item.venue ?? ""),
    topic: String(item.topic ?? "Other"),
    paperType: toPaperType(item.paperType),
    keywords: toStringList(item.keywords),
    abstract: String(item.abstract ?? ""),
  };
}

async function searchApiPapers(
  query: string,
  signal: AbortSignal,
): Promise<PaperSummary[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${apiBaseUrl}/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  const results =
    body && typeof body === "object" && "results" in body
      ? (body as { results: unknown }).results
      : [];

  return Array.isArray(results)
    ? results
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(toPaperSummary)
    : [];
}

export async function searchPapers(
  query: string,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const papers =
    searchSource === "api"
      ? await searchApiPapers(query, signal)
      : await searchSamplePapers(query, signal);

  return { papers, source: searchSource };
}