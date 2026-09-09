const API_URL = 'https://dummyjson.com'

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
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, expiresInMins: 1 }),
  })

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
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new AuthError('Your session is no longer valid.', response.status)
  }

  return (await response.json()) as AuthUser
}

export async function refreshSession(refreshToken: string): Promise<StoredSession> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (response.status !== 401) {
    return response
  }

  try {
    const refreshedSession = await refreshSession(session.refreshToken)
    localStorage.setItem(sessionStorageKey, JSON.stringify(refreshedSession))

    return fetch(`${API_URL}${path}`, {
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
