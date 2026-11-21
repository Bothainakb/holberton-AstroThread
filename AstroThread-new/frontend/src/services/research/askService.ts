import { apiBaseUrl } from "../search/searchService";

function readError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }

  return `The request failed with status ${status}. Please try again.`;
}

export async function askAboutPaper(
  paperId: string,
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/papers/${encodeURIComponent(paperId)}/ask`, {
    method: "POST",
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readError(body, response.status));
  }

  if (!body || typeof body !== "object" || !("answer" in body) || typeof body.answer !== "string") {
    throw new Error("The server sent an unexpected answer. Please try again.");
  }

  return body.answer;
}
