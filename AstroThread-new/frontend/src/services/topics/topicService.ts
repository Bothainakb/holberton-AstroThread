import { popularTopics as samplePopularTopics } from "../../data/popularTopics";
import type { PopularTopic } from "../../data/popularTopics";
import { apiBaseUrl, searchSource } from "../search/searchService";

function toPopularTopic(item: unknown): PopularTopic | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const { id, label, query } = item as Record<string, unknown>;

  if (typeof id !== "string" || typeof label !== "string" || typeof query !== "string") {
    return null;
  }

  return { id, label, query };
}

export async function getPopularTopics(signal: AbortSignal): Promise<PopularTopic[]> {
  if (searchSource !== "api") {
    return [...samplePopularTopics];
  }

  const response = await fetch(`${apiBaseUrl}/topics/popular`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Popular topics request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();

  return Array.isArray(body)
    ? body.map(toPopularTopic).filter((topic): topic is PopularTopic => topic !== null)
    : [];
}
