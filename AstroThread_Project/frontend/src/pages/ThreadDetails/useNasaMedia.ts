import { fetchDesignNasaMedia, fetchNasaMedia } from '../../services/api'
import type { ApiNasaMedia } from '../../services/nasaMedia'
import { useThreadRequest } from './useThreadRequest'

export type NasaMediaState =
  | { status: 'loading' }
  | { status: 'ready'; media: ApiNasaMedia }
  /** The server has no GET /api/threads/:id/nasa-media route yet. */
  | { status: 'unavailable' }
  /** NASA or the server failed; the message comes from the server when it sent one. */
  | { status: 'error'; message: string }

/**
 * Loads NASA images for a database thread through the backend. It is a
 * separate request from the thread details, so a slow NASA answer only delays
 * this section. Pass null while the thread id is not known.
 */
export function useNasaMedia(threadId: number | null): {
  state: NasaMediaState
  retry: () => void
} {
  const { state, retry } = useThreadRequest(
    threadId,
    fetchNasaMedia,
    'Something went wrong while loading NASA images.',
  )
  return { state: state.status === 'ready' ? { status: 'ready', media: state.data } : state, retry }
}

/** NASA images for a design preview, by slug; pass null for any other thread. */
export function useDesignNasaMedia(slug: string | null): {
  state: NasaMediaState
  retry: () => void
} {
  const { state, retry } = useThreadRequest(
    slug,
    fetchDesignNasaMedia,
    'Something went wrong while loading NASA images.',
  )
  return { state: state.status === 'ready' ? { status: 'ready', media: state.data } : state, retry }
}
