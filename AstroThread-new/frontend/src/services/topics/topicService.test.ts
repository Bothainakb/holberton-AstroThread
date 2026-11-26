
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPopularTopics } from "./topicService";
import { popularTopics } from "../../data/popularTopics";

vi.mock("../search/searchService", () => ({
  apiBaseUrl: "/api",
  searchSource: "api",
}));

describe("getPopularTopics", () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns popular topics from the API", async () => {
    const topics = [
      { id: "black-holes", label: "Black Holes", query: "black holes" },
      { id: "exoplanets", label: "Exoplanets", query: "exoplanets" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(topics),
      }),
    );

    const result = await getPopularTopics(signal);

    expect(result).toEqual(topics);
    expect(fetch).toHaveBeenCalledWith(
      "/api/topics/popular",
      expect.objectContaining({
        signal,
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("ignores invalid topic items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          { id: "black-holes", label: "Black Holes", query: "black holes" },
          null,
          "invalid",
          { id: 123, label: "Invalid", query: "invalid" },
          { id: "topic-2", label: "Missing query" },
        ]),
      }),
    );

    const result = await getPopularTopics(signal);

    expect(result).toEqual([
      { id: "black-holes", label: "Black Holes", query: "black holes" },
    ]);
  });

  it("returns an empty array when the API response is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      }),
    );

    const result = await getPopularTopics(signal);

    expect(result).toEqual([]);
  });

  it("returns an empty array when the API response is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await getPopularTopics(signal);

    expect(result).toEqual([]);
  });

  it("throws an error when the API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(getPopularTopics(signal)).rejects.toThrow(
      "Popular topics request failed with status 500",
    );
  });

  it("returns sample topics when the search source is not API", async () => {
    vi.resetModules();

    vi.doMock("../search/searchService", () => ({
      apiBaseUrl: "/api",
      searchSource: "sample",
    }));

    const { getPopularTopics: getSampleTopics } = await import("./topicService");

    const result = await getSampleTopics(signal);

    expect(result).toEqual(popularTopics);
    expect(result).not.toBe(popularTopics);
    expect(fetch).not.toHaveBeenCalled();
  });
});
