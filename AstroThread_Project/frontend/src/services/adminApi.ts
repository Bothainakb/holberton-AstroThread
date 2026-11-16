// Calls for the Admin Dashboard (Figma "11-Owner-Dashboard"). The backend calls
// this role "owner", so the routes are /api/owner/...; it checks the role on
// every request, so nothing here depends on what the page shows.
import { API_BASE_URL, ApiError } from './api'

export interface AdminThread {
  id: number
  slug: string | null
  title: string
  category: string
  description: string
  is_featured: boolean
  created_at: string | null
  updated_at: string | null
  timeline_event_count: number
  stage_count: number
  paper_count: number
}

export interface AdminThreadFields {
  title: string
  category: string
  description: string
  is_featured: boolean
}

export interface AdminEvent {
  id: number
  thread_id: number
  year: number
  title: string
  description: string | null
  source_name: string | null
  source_url: string | null
}

export interface AdminEventFields {
  year: number
  title: string
  description: string | null
  source_name: string | null
  source_url: string | null
}

async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Could not reach the AstroThread server.')
  }

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error
    throw new ApiError(
      typeof message === 'string' ? message : `The server responded with an error (${response.status}).`,
      response.status,
    )
  }

  return data as T
}

export function fetchAdminThreads(signal?: AbortSignal) {
  return request<AdminThread[]>('/api/owner/research-threads', 'GET', undefined, signal)
}

export function createAdminThread(fields: AdminThreadFields) {
  return request<AdminThread>('/api/owner/research-threads', 'POST', fields)
}

export function updateAdminThread(id: number, fields: AdminThreadFields) {
  return request<AdminThread>(`/api/owner/research-threads/${id}`, 'PATCH', fields)
}

export function deleteAdminThread(id: number) {
  return request<null>(`/api/owner/research-threads/${id}`, 'DELETE')
}

export function fetchAdminEvents(threadId: number, signal?: AbortSignal) {
  return request<AdminEvent[]>(
    `/api/owner/research-threads/${threadId}/timeline-events`,
    'GET',
    undefined,
    signal,
  )
}

export function createAdminEvent(threadId: number, fields: AdminEventFields) {
  return request<AdminEvent>(`/api/owner/research-threads/${threadId}/timeline-events`, 'POST', fields)
}

export function updateAdminEvent(id: number, fields: AdminEventFields) {
  return request<AdminEvent>(`/api/owner/timeline-events/${id}`, 'PATCH', fields)
}

export function deleteAdminEvent(id: number) {
  return request<null>(`/api/owner/timeline-events/${id}`, 'DELETE')
}
