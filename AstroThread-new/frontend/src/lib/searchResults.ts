import type { PaperSummary, PaperType } from "../types/research";

export type SortOption = "relevance" | "newest" | "oldest";
export type YearRange = "any" | "before-1950" | "1950-1999" | "2000-2009" | "2010-later";

export interface SearchFilters {
  topics: string[];
  paperTypes: PaperType[];
  yearRange: YearRange;
  author: string;
}

export interface SearchQueryState {
  query: string;
  filters: SearchFilters;
  sort: SortOption;
  page: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export const RESULTS_PER_PAGE = 5;

export const EMPTY_FILTERS: SearchFilters = {
  topics: [],
  paperTypes: [],
  yearRange: "any",
  author: "",
};

export const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export const YEAR_RANGES: readonly { value: YearRange; label: string }[] = [
  { value: "any", label: "Any year" },
  { value: "before-1950", label: "Before 1950" },
  { value: "1950-1999", label: "1950 to 1999" },
  { value: "2000-2009", label: "2000 to 2009" },
  { value: "2010-later", label: "2010 and later" },
];

export const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  observational: "Observational",
  theoretical: "Theoretical",
};

function isYearRange(value: string | null): value is YearRange {
  return YEAR_RANGES.some((range) => range.value === value);
}

function isSortOption(value: string | null): value is SortOption {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function isPaperType(value: string): value is PaperType {
  return value === "observational" || value === "theoretical";
}

export function readSearchState(params: URLSearchParams): SearchQueryState {
  const yearRange = params.get("year");
  const sort = params.get("sort");
  const page = Number.parseInt(params.get("page") ?? "1", 10);

  return {
    query: (params.get("q") ?? "").trim(),
    filters: {
      topics: params.getAll("topic"),
      paperTypes: params.getAll("type").filter(isPaperType),
      yearRange: isYearRange(yearRange) ? yearRange : "any",
      author: params.get("author") ?? "",
    },
    sort: isSortOption(sort) ? sort : "relevance",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildSearchParams(state: SearchQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.query) {
    params.set("q", state.query);
  }

  state.filters.topics.forEach((topic) => params.append("topic", topic));
  state.filters.paperTypes.forEach((type) => params.append("type", type));

  if (state.filters.yearRange !== "any") {
    params.set("year", state.filters.yearRange);
  }

  if (state.filters.author) {
    params.set("author", state.filters.author);
  }

  if (state.sort !== "relevance") {
    params.set("sort", state.sort);
  }

  if (state.page > 1) {
    params.set("page", String(state.page));
  }

  return params;
}

export function countActiveFilters(filters: SearchFilters): number {
  return (
    filters.topics.length +
    filters.paperTypes.length +
    (filters.yearRange !== "any" ? 1 : 0) +
    (filters.author ? 1 : 0)
  );
}

function matchesYearRange(year: number, range: YearRange) {
  switch (range) {
    case "before-1950":
      return year < 1950;
    case "1950-1999":
      return year >= 1950 && year <= 1999;
    case "2000-2009":
      return year >= 2000 && year <= 2009;
    case "2010-later":
      return year >= 2010;
    default:
      return true;
  }
}

export function applyFilters(
  papers: readonly PaperSummary[],
  filters: SearchFilters,
): PaperSummary[] {
  return papers.filter(
    (paper) =>
      (filters.topics.length === 0 || filters.topics.includes(paper.topic)) &&
      (filters.paperTypes.length === 0 ||
        filters.paperTypes.includes(paper.paperType)) &&
      matchesYearRange(paper.year, filters.yearRange) &&
      (!filters.author || paper.authors.includes(filters.author)),
  );
}

export function sortPapers(
  papers: readonly PaperSummary[],
  sort: SortOption,
): PaperSummary[] {
  if (sort === "newest") {
    return [...papers].sort((a, b) => b.year - a.year);
  }

  if (sort === "oldest") {
    return [...papers].sort((a, b) => a.year - b.year);
  }

  return [...papers];
}

export function paginate<Item>(items: readonly Item[], page: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / RESULTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * RESULTS_PER_PAGE;

  return {
    items: items.slice(start, start + RESULTS_PER_PAGE),
    currentPage,
    pageCount,
  };
}

function countBy(values: string[]): FacetOption[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getTopicFacets(papers: readonly PaperSummary[]): FacetOption[] {
  return countBy(papers.map((paper) => paper.topic));
}

export function getPaperTypeFacets(papers: readonly PaperSummary[]): FacetOption[] {
  return countBy(papers.map((paper) => paper.paperType)).map((option) => ({
    ...option,
    label: isPaperType(option.value) ? PAPER_TYPE_LABELS[option.value] : option.value,
  }));
}

export function getAuthorFacets(papers: readonly PaperSummary[]): FacetOption[] {
  return countBy(papers.flatMap((paper) => paper.authors));
}

export function getRelatedKeywords(
  papers: readonly PaperSummary[],
  query: string,
  limit = 8,
): FacetOption[] {
  const normalizedQuery = query.toLowerCase();

  return countBy(papers.flatMap((paper) => paper.keywords))
    .filter((option) => option.value.toLowerCase() !== normalizedQuery)
    .slice(0, limit);
}