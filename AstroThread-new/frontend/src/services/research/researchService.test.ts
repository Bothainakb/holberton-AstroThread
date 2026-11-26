
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPaper,
  getRelatedPapers,
  getTopicPapers,
} from "./researchService";
import { searchPapers } from "../search/searchService";
import type { PaperDetails, PaperSummary } from "../../types/research";

vi.mock("../../data/demoAdmin", () => ({
  isPaperUnavailable: vi.fn(() => false),
}));

vi.mock("../search/searchService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../search/searchService")>();

  return {
    ...actual,
    searchSource: "api",
    searchPapers: vi.fn(),
  };
});

describe("researchService", () => {
  const signal = new AbortController().signal;

  const samplePaper: PaperDetails = {
    id: "paper-1",
    title: "Black Holes",
    authors: ["Alaa Ali"],
    year: 2024,
    venue: "Science Journal",
    topic: "Black Holes",
    paperType: "observational",
    keywords: ["black holes", "space"],
    abstract: "A study about black holes.",
    method: "Observation",
    mainFinding: "Important discovery",
    whyItMatters: "Helps understand space",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(searchPapers).mockReset();
  });

  describe("getPaper", () => {
    it("returns paper details from the API", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(samplePaper),
      }));

      const result = await getPaper("paper-1", signal);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("paper-1");
      expect(result?.title).toBe("Black Holes");
      expect(result?.method).toBe("Observation");
      expect(fetch).toHaveBeenCalledWith(
        "/api/papers/paper-1",
        expect.objectContaining({
          signal,
          headers: { Accept: "application/json" },
        }),
      );
    });

    it("encodes the paper ID in the request URL", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(samplePaper),
      }));

      await getPaper("paper/123", signal);

      expect(fetch).toHaveBeenCalledWith(
        "/api/papers/paper%2F123",
        expect.any(Object),
      );
    });

    it("returns null when the paper is not found", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        json: vi.fn(),
      }));

      const result = await getPaper("missing", signal);

      expect(result).toBeNull();
    });

    it("uses fallback text when paper details are missing", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...samplePaper,
          method: "",
          mainFinding: null,
          whyItMatters: 123,
        }),
      }));

      const result = await getPaper("paper-1", signal);

      expect(result?.method).toBe("Not available for this paper yet.");
      expect(result?.mainFinding).toBe("Not available for this paper yet.");
      expect(result?.whyItMatters).toBe("Not available for this paper yet.");
    });

    it("returns null when the API response is not an object", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      }));

      const result = await getPaper("paper-1", signal);

      expect(result).toBeNull();
    });

    it("throws an error when the API request fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      }));

      await expect(getPaper("paper-1", signal)).rejects.toThrow(
        "Request failed with status 500",
      );
    });
  });

  describe("getRelatedPapers", () => {
    const paper: PaperSummary = samplePaper;

    it("returns related papers from the API", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            { ...samplePaper, id: "related-1" },
            { ...samplePaper, id: "related-2" },
          ],
        }),
      }));

      const result = await getRelatedPapers(paper, signal);

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.id)).toEqual([
        "related-1",
        "related-2",
      ]);
    });

    it("limits related papers to three results", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: Array.from({ length: 5 }, (_, index) => ({
            ...samplePaper,
            id: `related-${index + 1}`,
          })),
        }),
      }));

      const result = await getRelatedPapers(paper, signal);

      expect(result).toHaveLength(3);
    });

    it("ignores invalid items in the API response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            { ...samplePaper, id: "related-1" },
            null,
            "invalid",
            123,
          ],
        }),
      }));

      const result = await getRelatedPapers(paper, signal);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("related-1");
    });

    it("returns an empty array when there are no related papers", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      }));

      const result = await getRelatedPapers(paper, signal);

      expect(result).toEqual([]);
    });

    it("throws an error when the API request fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      }));

      await expect(getRelatedPapers(paper, signal)).rejects.toThrow(
        "Request failed with status 500",
      );
    });
  });

  describe("getTopicPapers", () => {
    it("returns papers matching the requested topic", async () => {
      vi.mocked(searchPapers).mockResolvedValue({
        papers: [
          { ...samplePaper, id: "paper-1", topic: "Black Holes", year: 2024 },
          { ...samplePaper, id: "paper-2", topic: "Exoplanets", year: 2023 },
          { ...samplePaper, id: "paper-3", topic: "Black Holes", year: 2020 },
        ],
        source: "api",
      });

      const result = await getTopicPapers("Black Holes", signal);

      expect(result.map((paper) => paper.id)).toEqual([
        "paper-3",
        "paper-1",
      ]);
    });

    it("matches topics without case or surrounding whitespace differences", async () => {
      vi.mocked(searchPapers).mockResolvedValue({
        papers: [
          { ...samplePaper, id: "paper-1", topic: "black holes" },
          { ...samplePaper, id: "paper-2", topic: "Exoplanets" },
        ],
        source: "api",
      });

      const result = await getTopicPapers(" Black Holes ", signal);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("paper-1");
    });

    it("returns an empty array when no papers match the topic", async () => {
      vi.mocked(searchPapers).mockResolvedValue({
        papers: [
          { ...samplePaper, topic: "Exoplanets" },
        ],
        source: "api",
      });

      const result = await getTopicPapers("Black Holes", signal);

      expect(result).toEqual([]);
    });

    it("passes the topic and signal to searchPapers", async () => {
      vi.mocked(searchPapers).mockResolvedValue({
        papers: [],
        source: "api",
      });

      await getTopicPapers("Black Holes", signal);

      expect(searchPapers).toHaveBeenCalledWith("Black Holes", signal);
    });
  });
});
