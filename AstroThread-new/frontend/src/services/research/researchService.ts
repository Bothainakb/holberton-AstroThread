import type { PaperDetails, PaperSummary } from "../../types/research";
import {
  apiBaseUrl,
  searchPapers,
  searchSource,
  toPaperSummary,
  wait,
} from "../search/searchService";

const SAMPLE_DELAY_MS = 300;
const RELATED_PAPER_LIMIT = 3;

const MISSING_DETAIL = "Not available for this paper yet.";

function toPaperDetails(item: Record<string, unknown>): PaperDetails {
  return {
    ...toPaperSummary(item),
    method: typeof item.method === "string" && item.method ? item.method : MISSING_DETAIL,
    mainFinding:
      typeof item.mainFinding === "string" && item.mainFinding ? item.mainFinding : MISSING_DETAIL,
    whyItMatters:
      typeof item.whyItMatters === "string" && item.whyItMatters ? item.whyItMatters : MISSING_DETAIL,
  };
}

async function fetchJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function loadSampleLibrary() {
  const [{ samplePapers }, { samplePaperDetails }] = await Promise.all([
    import("../search/sampleSearchData"),
    import("../../data/samplePaperDetails"),
  ]);

  return { samplePapers, samplePaperDetails };
}

function countSharedKeywords(a: PaperSummary, b: PaperSummary) {
  const keywords = new Set(a.keywords.map((keyword) => keyword.toLowerCase()));
  return b.keywords.filter((keyword) => keywords.has(keyword.toLowerCase())).length;
}

export async function getPaper(
  id: string,
  signal: AbortSignal,
): Promise<PaperDetails | null> {
  if (searchSource === "api") {
    const body = await fetchJson(`/papers/${encodeURIComponent(id)}`, signal);
    return isRecord(body) ? toPaperDetails(body) : null;
  }

  const { samplePapers, samplePaperDetails } = await loadSampleLibrary();
  await wait(SAMPLE_DELAY_MS, signal);

  const paper = samplePapers.find((item) => item.id === id);

  if (!paper) {
    return null;
  }

  return toPaperDetails({ ...paper, ...samplePaperDetails[paper.id] });
}

export async function getRelatedPapers(
  paper: PaperSummary,
  signal: AbortSignal,
): Promise<PaperSummary[]> {
  if (searchSource === "api") {
    const body = await fetchJson(
      `/papers/${encodeURIComponent(paper.id)}/related`,
      signal,
    );
    const results = isRecord(body) && Array.isArray(body.results) ? body.results : [];

    return results.filter(isRecord).map(toPaperSummary).slice(0, RELATED_PAPER_LIMIT);
  }

  const { samplePapers } = await loadSampleLibrary();

  return samplePapers
    .filter((item) => item.id !== paper.id)
    .map((item) => ({
      item,
      score:
        countSharedKeywords(paper, item) * 2 + (item.topic === paper.topic ? 3 : 0),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.item.year - a.item.year)
    .slice(0, RELATED_PAPER_LIMIT)
    .map((match) => match.item);
}

export async function getTopicPapers(
  topic: string,
  signal: AbortSignal,
): Promise<PaperSummary[]> {
  const { papers } = await searchPapers(topic, signal);
  const wanted = topic.trim().toLocaleLowerCase();

  return papers
    .filter((paper) => paper.topic.trim().toLocaleLowerCase() === wanted)
    .sort((a, b) => a.year - b.year);
}