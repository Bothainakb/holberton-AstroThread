
import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAboutPaper } from "./askService";

vi.mock("../search/searchService", () => ({
  apiBaseUrl: "/api",
}));

describe("askAboutPaper", () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a POST request and returns the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        answer: "Black holes are regions of spacetime.",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await askAboutPaper(
      "paper-123",
      "What is a black hole?",
      signal,
    );

    expect(result).toBe("Black holes are regions of spacetime.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/papers/paper-123/ask",
      expect.objectContaining({
        method: "POST",
        signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: "What is a black hole?" }),
      }),
    );
  });

  it("encodes the paper ID in the request URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ answer: "Answer" }),
      }),
    );

    await askAboutPaper("paper/123", "Question", signal);

    expect(fetch).toHaveBeenCalledWith(
      "/api/papers/paper%2F123/ask",
      expect.any(Object),
    );
  });

  it("throws the server error message when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: "Paper not found",
        }),
      }),
    );

    await expect(
      askAboutPaper("123", "Question", signal),
    ).rejects.toThrow("Paper not found");
  });

  it("uses a fallback message when the server does not provide an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    await expect(
      askAboutPaper("123", "Question", signal),
    ).rejects.toThrow(
      "The request failed with status 500. Please try again.",
    );
  });

  it("throws when the response does not contain an answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    await expect(
      askAboutPaper("123", "Question", signal),
    ).rejects.toThrow(
      "The server sent an unexpected answer. Please try again.",
    );
  });

  it("throws when the answer is not a string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ answer: 123 }),
      }),
    );

    await expect(
      askAboutPaper("123", "Question", signal),
    ).rejects.toThrow(
      "The server sent an unexpected answer. Please try again.",
    );
  });

  it("handles invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      }),
    );

    await expect(
      askAboutPaper("123", "Question", signal),
    ).rejects.toThrow(
      "The request failed with status 502. Please try again.",
    );
  });
});
