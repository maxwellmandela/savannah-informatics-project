const API_URL = import.meta.env.VITE_API_URL ?? 'https://dummyjson.com'
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 10_000

class RequestTimeoutError extends Error {
  constructor() {
    super('The request took too long. Check your connection and try again.')
    this.name = 'RequestTimeoutError'
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const signal = options.signal

  function abortRequest() {
    controller.abort()
  }

  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener('abort', abortRequest, { once: true })
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new RequestTimeoutError()
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortRequest)
  }
}

export type AuthUser = {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  image: string
}

type LoginResponse = AuthUser & {
  accessToken: string
  refreshToken: string
}

export type StoredSession = {
  accessToken: string
  refreshToken: string
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export const sessionStorageKey = 'clinic-stock-session'

export async function loginUser(
  username: string,
  password: string,
): Promise<{ user: AuthUser; session: StoredSession }> {
  let response: Response

  try {
    response = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, expiresInMins: 1 }),
    })
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error('Sign-in took too long. Check your connection and try again.', {
        cause: error,
      })
    }

    throw new Error(
      'We could not reach the sign-in service. Check your connection and try again.',
      {
        cause: error,
      },
    )
  }

  if (!response.ok) {
    throw new Error('We could not sign you in. Check your username and password.')
  }

  const result = (await response.json()) as LoginResponse
  const { accessToken, refreshToken, ...user } = result

  return {
    user,
    session: { accessToken, refreshToken },
  }
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetchWithTimeout(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new AuthError('Your session is no longer valid.', response.status)
  }

  return (await response.json()) as AuthUser
}

export async function refreshSession(refreshToken: string): Promise<StoredSession> {
  const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, expiresInMins: 1 }),
  })

  if (!response.ok) {
    throw new AuthError('Your session could not be refreshed.', response.status)
  }

  const result = (await response.json()) as StoredSession
  return result
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = readStoredSession()

  if (!session) {
    throw new AuthError('Your session is no longer valid.', 401)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
  } catch (error) {
    if (options.signal?.aborted) {
      throw error
    }

    if (error instanceof RequestTimeoutError) {
      throw error
    }

    throw new Error(
      'We could not reach the stock service. Check your connection and try again.',
      {
        cause: error,
      },
    )
  }

  if (response.status !== 401) {
    return response
  }

  try {
    const refreshedSession = await refreshSession(session.refreshToken)
    localStorage.setItem(sessionStorageKey, JSON.stringify(refreshedSession))

    return fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${refreshedSession.accessToken}`,
      },
    })
  } catch (error) {
    localStorage.removeItem(sessionStorageKey)
    throw error
  }
}

export function readStoredSession(): StoredSession | null {
  const storedSession = localStorage.getItem(sessionStorageKey)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession) as StoredSession
  } catch {
    localStorage.removeItem(sessionStorageKey)
    return null
  }
}
