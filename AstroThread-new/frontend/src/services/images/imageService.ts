import type { SpaceImage } from "../../types/research";
import {
  apiBaseUrl,
  getSearchTerms,
  normalizeSearchText,
  searchSource,
  wait,
} from "../search/searchService";
import type { SearchSource } from "../search/searchService";

export interface ImageSearchResponse {
  images: SpaceImage[];
  source: SearchSource;
}

const SAMPLE_DELAY_MS = 500;

export const imageSource: SearchSource = searchSource;

async function searchSampleImages(query: string, signal: AbortSignal): Promise<SpaceImage[]> {
  const { sampleImages } = await import("./sampleImageData");
  await wait(SAMPLE_DELAY_MS, signal);

  const terms = getSearchTerms(query);

  if (terms.length === 0) {
    return [];
  }

  return sampleImages
    .filter((image) => {
      const text = normalizeSearchText(
        [image.title, image.description, image.keywords.join(" ")].join(" "),
      );
      return terms.some((term) => text.includes(term));
    })
    .map((image) => ({
      id: image.id,
      title: image.title,
      description: image.description,
      thumbnailUrl: image.thumbnailUrl,
      imageUrl: image.imageUrl,
      pageUrl: image.pageUrl,
      credit: image.credit,
      date: image.date,
    }));
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toHttpsUrl(value: unknown): string {
  const url = toText(value);
  return url.startsWith("https://") || url.startsWith("http://") ? url : "";
}

export function toSpaceImage(item: Record<string, unknown>): SpaceImage {
  return {
    id: String(item.id ?? ""),
    title: toText(item.title) || "Untitled image",
    description: toText(item.description),
    thumbnailUrl: toHttpsUrl(item.thumbnailUrl),
    imageUrl: toHttpsUrl(item.imageUrl),
    pageUrl: toHttpsUrl(item.pageUrl),
    credit: toText(item.credit),
    date: toText(item.date),
  };
}

async function searchApiImages(query: string, signal: AbortSignal): Promise<SpaceImage[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${apiBaseUrl}/images?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  const results =
    body && typeof body === "object" && "results" in body
      ? (body as { results: unknown }).results
      : [];

  return Array.isArray(results)
    ? results
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(toSpaceImage)
        .filter((image) => image.id)
    : [];
}

export async function searchImages(
  query: string,
  signal: AbortSignal,
): Promise<ImageSearchResponse> {
  const images =
    imageSource === "api"
      ? await searchApiImages(query, signal)
      : await searchSampleImages(query, signal);

  return { images, source: imageSource };
}