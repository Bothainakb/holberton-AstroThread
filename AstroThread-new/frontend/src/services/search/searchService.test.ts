
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PaperSummary } from "../../types/research";
import {
  normalizeSearchText,
  getSearchTerms,
  rankPapers,
  toPaperSummary,
  wait,
} from "./searchService";

vi.mock("../../data/demoAdmin", () => ({
  isPaperUnavailable: vi.fn(() => false),
}));

const createPaper = (
  overrides: Partial<PaperSummary> = {},
): PaperSummary => ({
  id: "paper-1",
  title: "Black Hole Research",
  authors: ["Alaa Ali"],
  year: 2024,
  venue: "Science Journal",
  topic: "Black Holes",
  paperType: "observational",
  keywords: ["space", "gravity"],
  abstract: "Research about black holes and gravity.",
  ...overrides,
});

describe("normalizeSearchText", () => {
  it("converts text to lowercase", () => {
    expect(normalizeSearchText("BLACK HOLES")).toBe("black holes");
  });

  it("removes extra spaces", () => {
    expect(normalizeSearchText("  black   holes  ")).toBe("black holes");
  });

  it("removes punctuation", () => {
    expect(normalizeSearchText("black-holes!")).toBe("black holes");
  });

  it("normalizes accented characters", () => {
    expect(normalizeSearchText("café")).toBe("cafe");
  });

  it("preserves numbers", () => {
    expect(normalizeSearchText("Space 2024")).toBe("space 2024");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeSearchText("")).toBe("");
  });
});

describe("getSearchTerms", () => {
  it("extracts words from a query", () => {
    expect(getSearchTerms("black holes")).toEqual(["black", "hole"]);
  });

  it("removes stop words", () => {
    expect(getSearchTerms("what is the black hole")).toEqual([
      "black",
      "hole",
    ]);
  });

  it("removes duplicate terms", () => {
    expect(getSearchTerms("space space gravity")).toEqual([
      "space",
      "gravity",
    ]);
  });

  it("converts words ending in ies", () => {
    expect(getSearchTerms("galaxies")).toEqual(["galaxy"]);
  });

  it("removes a final s from words", () => {
    expect(getSearchTerms("planets")).toEqual(["planet"]);
  });

  it("keeps words ending in ss unchanged", () => {
    expect(getSearchTerms("mass")).toEqual(["mass"]);
  });

  it("returns an empty array for stop words only", () => {
    expect(getSearchTerms("what is the")).toEqual([]);
  });
});

describe("rankPapers", () => {
  const papers = [
    createPaper({
      id: "1",
      title: "Black Hole Research",
      keywords: ["gravity"],
      topic: "Astronomy",
      abstract: "Research about space.",
    }),
    createPaper({
      id: "2",
      title: "Exoplanet Discovery",
      keywords: ["planets"],
      topic: "Space",
      abstract: "Discovering distant worlds.",
    }),
    createPaper({
      id: "3",
      title: "Gravitational Waves",
      keywords: ["black holes"],
      topic: "Physics",
      abstract: "Observations of distant objects.",
    }),
  ];

  it("returns an empty array for an empty query", () => {
    expect(rankPapers(papers, "")).toEqual([]);
  });

  it("returns an empty array for stop words only", () => {
    expect(rankPapers(papers, "what is the")).toEqual([]);
  });

  it("finds papers matching the query", () => {
    const result = rankPapers(papers, "exoplanet");

    expect(result.map((paper) => paper.id)).toContain("2");
  });

  it("prioritizes title matches", () => {
    const result = rankPapers(papers, "black");

    expect(result[0].id).toBe("1");
  });

  it("finds matches in keywords", () => {
    const result = rankPapers(papers, "gravity");

    expect(result.map((paper) => paper.id)).toContain("1");
  });

  it("finds matches in the abstract", () => {
    const result = rankPapers(papers, "distant");

    expect(result.map((paper) => paper.id)).toContain("3");
  });

    it("returns only full matches when available", () => {
     const result = rankPapers(papers, "black hole");

     expect(result.map((paper) => paper.id)).toEqual(["1", "3"]);
    });

  it("does not return papers without matching terms", () => {
    const result = rankPapers(papers, "quantum");

    expect(result).toEqual([]);
  });

  it("matches plural search terms", () => {
    const result = rankPapers(papers, "planets");

    expect(result.map((paper) => paper.id)).toContain("2");
  });
});

describe("toPaperSummary", () => {
  it("converts valid paper data", () => {
    const result = toPaperSummary({
      id: "123",
      title: "Black Holes",
      authors: ["Alaa Ali"],
      year: 2024,
      venue: "Science Journal",
      topic: "Astronomy",
      paperType: "theoretical",
      keywords: ["space"],
      abstract: "Research abstract",
    });

    expect(result).toEqual({
      id: "123",
      title: "Black Holes",
      authors: ["Alaa Ali"],
      year: 2024,
      venue: "Science Journal",
      topic: "Astronomy",
      paperType: "theoretical",
      keywords: ["space"],
      abstract: "Research abstract",
    });
  });

  it("uses default values for missing fields", () => {
    const result = toPaperSummary({});

    expect(result).toEqual({
      id: "",
      title: "Untitled paper",
      authors: [],
      year: 0,
      venue: "",
      topic: "Other",
      paperType: "observational",
      keywords: [],
      abstract: "",
    });
  });

  it("converts numeric IDs to strings", () => {
    expect(toPaperSummary({ id: 123 }).id).toBe("123");
  });

  it("converts invalid years to zero", () => {
    expect(toPaperSummary({ year: "invalid" }).year).toBe(0);
  });

  it("uses observational for unknown paper types", () => {
    expect(toPaperSummary({ paperType: "unknown" }).paperType).toBe(
      "observational",
    );
  });

  it("filters non-string authors and keywords", () => {
    const result = toPaperSummary({
      authors: ["Alaa", 123, null],
      keywords: ["space", false, "gravity"],
    });

    expect(result.authors).toEqual(["Alaa"]);
    expect(result.keywords).toEqual(["space", "gravity"]);
  });
});

describe("wait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified time", async () => {
    const controller = new AbortController();
    const promise = wait(500, controller.signal);

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects when the request is aborted", async () => {
    const controller = new AbortController();
    const promise = wait(500, controller.signal);

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
      message: "Search cancelled",
    });
  });
});

describe("searchPapers API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SEARCH_SOURCE", "api");
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches papers from the API", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "123",
            title: "Black Holes",
            authors: ["Alaa Ali"],
            year: 2024,
            venue: "Science Journal",
            topic: "Astronomy",
            paperType: "theoretical",
            keywords: ["space"],
            abstract: "Research abstract",
          },
        ],
      }),
    } as Response);

    const { searchPapers } = await import("./searchService");
    const controller = new AbortController();

    const result = await searchPapers("black holes", controller.signal);

    expect(result.source).toBe("api");
    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].title).toBe("Black Holes");
    expect(fetch).toHaveBeenCalledWith(
      "/api/search?q=black+holes",
      expect.objectContaining({
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("throws an error when the API request fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { searchPapers } = await import("./searchService");
    const controller = new AbortController();

    await expect(
      searchPapers("black holes", controller.signal),
    ).rejects.toThrow("Search request failed with status 500");
  });

  it("returns an empty list when API results are not an array", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: null }),
    } as Response);

    const { searchPapers } = await import("./searchService");
    const controller = new AbortController();

    const result = await searchPapers("black holes", controller.signal);

    expect(result.papers).toEqual([]);
  });
});
