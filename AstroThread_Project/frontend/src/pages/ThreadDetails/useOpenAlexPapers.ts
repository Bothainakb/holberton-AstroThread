import { fetchDesignOpenAlexPapers, fetchOpenAlexPapers } from '../../services/api'
import type { ApiOpenAlexPapers } from '../../services/openAlexPapers'
import { useThreadRequest, type ThreadRequestState } from './useThreadRequest'

export type OpenAlexPapersState = ThreadRequestState<ApiOpenAlexPapers>

/**
 * Searches OpenAlex through the backend for a thread that has no papers in
 * the database. Pass null when the database has papers or the id is unknown.
 */
export function useOpenAlexPapers(threadId: number | null) {
  return useThreadRequest(
    threadId,
    fetchOpenAlexPapers,
    'Something went wrong while searching OpenAlex for papers.',
  )
}

/**
 * Design previews whose papers come from OpenAlex. Must match DESIGN_THREADS in
 * backend/app/api/v1/openalex_papers.py (the backend answers 404 for others).
 */
export const DESIGN_PAPER_PREVIEWS: ReadonlySet<string> = new Set([
  'dark-matter',
])

/** OpenAlex papers for a design preview; pass null for any other thread. */
export function useDesignOpenAlexPapers(slug: string | null) {
  return useThreadRequest(
    slug,
    fetchDesignOpenAlexPapers,
    'Something went wrong while searching OpenAlex for papers.',
  )
}
