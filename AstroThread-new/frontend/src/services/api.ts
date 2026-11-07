
import type { PopularTopic } from '../data/popularTopics'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export interface Paper {
  title: string
  authors: string | null
  year: number | null
  abstract: string | null
  url: string | null
  cited_by_count: number | null
}

export interface SearchResult {
  query: string
  topic: { slug: string; title: string } | null
  papers: Paper[]
}

export class ApiError extends Error {}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Could not reach the AstroThread server. Please try again.')
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `The server responded with an error (${response.status}). Please try again.`
    throw new ApiError(message)
  }
  if (body === null) {
    throw new ApiError('The server sent an unexpected response. Please try again.')
  }
  return body as T
}

export function fetchPopularTopics(signal?: AbortSignal): Promise<PopularTopic[]> {
  return getJson<PopularTopic[]>('/api/topics/popular', signal)
}
export function searchPapers(query: string, signal?: AbortSignal): Promise<SearchResult> {
  return getJson<SearchResult>(`/api/search?${new URLSearchParams({ q: query })}`, signal)
}


export interface TopicOverview {
  slug: string
  title: string
  overview: string
  generated_at: string | null
}

export function fetchTopicOverview(slug: string, signal?: AbortSignal): Promise<TopicOverview> {
  return getJson<TopicOverview>(`/api/topics/${encodeURIComponent(slug)}/overview`, signal)
}
