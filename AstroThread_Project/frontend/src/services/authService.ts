
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

/**
 * An error from the backend. The backend always replies with
 * { "error": "<message>", "field": "<input name>" } (field is optional),
 * so `field` says which input the message belongs under.
 */
export class AuthError extends Error {
  field?: string
  status?: number

  constructor(message: string, field?: string, status?: number) {
    super(message)
    this.name = 'AuthError'
    this.field = field
    this.status = status
  }
}

type ErrorBody = { error?: string; field?: string }

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new AuthError('Cannot reach the server. Please check your connection and try again.')
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
  }

  if (!response.ok) {
    const { error, field } = (body ?? {}) as ErrorBody
    const fallback =
      response.status >= 500 ? 'Something went wrong on our side. Please try again later.' : 'Request failed.'
    throw new AuthError(error ?? fallback, field, response.status)
  }
  return body as T
}

export type Role = 'user' | 'owner'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: Role
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const body = await apiRequest<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.user
}
