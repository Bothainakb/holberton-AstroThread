import type { PaperSummary } from "../types/research";

type PaperAuthorsAndYear = Pick<PaperSummary, "authors" | "year">;
type PaperMetaFields = Pick<PaperSummary, "authors" | "venue" | "year">;

const DEFAULT_AUTHOR_LIMIT = 3;
const UNKNOWN_AUTHORS = "Unknown authors";

function getSurname(author: string): string {
  if (/collaboration|consortium|team/i.test(author)) {
    return author;
  }

  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] ?? author;
}

export function formatAuthors(
  authors: readonly string[],
  limit = DEFAULT_AUTHOR_LIMIT,
): string {
  if (authors.length === 0) {
    return UNKNOWN_AUTHORS;
  }

  if (authors.length <= limit) {
    return authors.join(", ");
  }

  return `${authors.slice(0, limit).join(", ")} et al.`;
}

export function formatAllAuthors(authors: readonly string[]): string {
  if (authors.length === 0) {
    return UNKNOWN_AUTHORS;
  }

  if (authors.length === 1) {
    return authors[0];
  }

  return `${authors.slice(0, -1).join(", ")} and ${authors[authors.length - 1]}`;
}

export function formatShortCitation(paper: PaperAuthorsAndYear): string {
  const surnames = paper.authors.map(getSurname);
  let names: string;

  if (surnames.length === 0) {
    names = UNKNOWN_AUTHORS;
  } else if (surnames.length === 1) {
    names = surnames[0];
  } else if (surnames.length === 2) {
    names = `${surnames[0]} and ${surnames[1]}`;
  } else {
    names = `${surnames[0]} et al.`;
  }

  return paper.year ? `${names}, ${paper.year}` : names;
}

export function formatPaperMeta(paper: PaperMetaFields): string {
  return [formatAuthors(paper.authors), paper.venue, paper.year || ""]
    .filter(Boolean)
    .join(" · ");
}

export function formatPublication(paper: Pick<PaperSummary, "venue" | "year">): string {
  return [paper.venue, paper.year || ""].filter(Boolean).join(", ");
}

export function formatYearRange(firstYear: number, lastYear: number): string {
  if (!firstYear || !lastYear) {
    return "";
  }

  return firstYear === lastYear ? String(firstYear) : `${firstYear} to ${lastYear}`;
}