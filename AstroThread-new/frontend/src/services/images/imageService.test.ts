
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toSpaceImage } from "./imageService";

describe("toSpaceImage", () => {
  it("converts valid image data", () => {
    const result = toSpaceImage({
      id: "image-1",
      title: "Black Hole",
      description: "A black hole image",
      thumbnailUrl: "https://example.com/thumb.jpg",
      imageUrl: "https://example.com/image.jpg",
      pageUrl: "https://example.com/page",
      credit: "NASA",
      date: "2024-01-01",
    });

    expect(result).toEqual({
      id: "image-1",
      title: "Black Hole",
      description: "A black hole image",
      thumbnailUrl: "https://example.com/thumb.jpg",
      imageUrl: "https://example.com/image.jpg",
      pageUrl: "https://example.com/page",
      credit: "NASA",
      date: "2024-01-01",
    });
  });

  it("uses default values for missing fields", () => {
    const result = toSpaceImage({});

    expect(result).toEqual({
      id: "",
      title: "Untitled image",
      description: "",
      thumbnailUrl: "",
      imageUrl: "",
      pageUrl: "",
      credit: "",
      date: "",
    });
  });

  it("converts numeric IDs to strings", () => {
    expect(toSpaceImage({ id: 123 }).id).toBe("123");
  });

  it("rejects invalid image URLs", () => {
    const result = toSpaceImage({
      thumbnailUrl: "javascript:alert(1)",
      imageUrl: "/images/space.jpg",
      pageUrl: "ftp://example.com",
    });

    expect(result.thumbnailUrl).toBe("");
    expect(result.imageUrl).toBe("");
    expect(result.pageUrl).toBe("");
  });

  it("accepts HTTPS URLs", () => {
    const result = toSpaceImage({
      thumbnailUrl: "https://example.com/thumb.jpg",
      imageUrl: "https://example.com/image.jpg",
      pageUrl: "https://example.com/page",
    });

    expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result.imageUrl).toBe("https://example.com/image.jpg");
    expect(result.pageUrl).toBe("https://example.com/page");
  });

  it("accepts HTTP URLs", () => {
    const result = toSpaceImage({
      thumbnailUrl: "http://example.com/thumb.jpg",
      imageUrl: "http://example.com/image.jpg",
      pageUrl: "http://example.com/page",
    });

    expect(result.thumbnailUrl).toBe("http://example.com/thumb.jpg");
    expect(result.imageUrl).toBe("http://example.com/image.jpg");
    expect(result.pageUrl).toBe("http://example.com/page");
  });

  it("does not accept non-string text values", () => {
    const result = toSpaceImage({
      title: 123,
      description: null,
      credit: false,
      date: {},
    });

    expect(result.title).toBe("Untitled image");
    expect(result.description).toBe("");
    expect(result.credit).toBe("");
    expect(result.date).toBe("");
  });
});

describe("searchImages API", () => {
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

  it("fetches images from the API", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "image-1",
            title: "Black Hole",
            description: "Space image",
            thumbnailUrl: "https://example.com/thumb.jpg",
            imageUrl: "https://example.com/image.jpg",
            pageUrl: "https://example.com/page",
            credit: "NASA",
            date: "2024-01-01",
          },
        ],
      }),
    } as Response);

    const { searchImages } = await import("./imageService");
    const controller = new AbortController();

    const result = await searchImages("black hole", controller.signal);

    expect(result.source).toBe("api");
    expect(result.images).toHaveLength(1);
    expect(result.images[0].title).toBe("Black Hole");
    expect(fetch).toHaveBeenCalledWith(
      "/api/images?q=black+hole",
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

    const { searchImages } = await import("./imageService");
    const controller = new AbortController();

    await expect(
      searchImages("black hole", controller.signal),
    ).rejects.toThrow("Image request failed with status 500");
  });

  it("returns an empty list when API results are not an array", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: null }),
    } as Response);

    const { searchImages } = await import("./imageService");
    const controller = new AbortController();

    const result = await searchImages("black hole", controller.signal);

    expect(result.images).toEqual([]);
  });

  it("filters API images without IDs", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: "image-1", title: "Black Hole" },
          { title: "Missing ID" },
          null,
        ],
      }),
    } as Response);

    const { searchImages } = await import("./imageService");
    const controller = new AbortController();

    const result = await searchImages("black hole", controller.signal);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).toBe("image-1");
  });
});
