// How many papers a thread lists, shared by Thread Details (which shows them)
// and the thread cards (which show the count). Kept free of Vite-only code so
// `npm test` can run it in Node.

/** Papers listed per thread on Thread Details: the first, most relevant ones. */
export const MAX_PAPERS = 3

/**
 * The number of papers a thread's page lists: its papers in the database, or,
 * for a thread with none, its OpenAlex papers (null while that is not known).
 */
export function listedPaperCount(databaseCount: number, openAlexCount: number | null): number | null {
  if (databaseCount > 0) return Math.min(databaseCount, MAX_PAPERS)
  return openAlexCount === null ? null : Math.min(openAlexCount, MAX_PAPERS)
}
