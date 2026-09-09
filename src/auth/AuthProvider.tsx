import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AuthError,
  getCurrentUser,
  loginUser,
  readStoredSession,
  refreshSession,
  sessionStorageKey,
} from '../api/auth'
import type { AuthUser, StoredSession } from '../api/auth'
import { AuthContext } from './AuthContext'

async function getUserWithRefresh(session: StoredSession) {
  try {
    return await getCurrentUser(session.accessToken)
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 401) {
      throw error
    }

    const refreshedSession = await refreshSession(session.refreshToken)
    localStorage.setItem(sessionStorageKey, JSON.stringify(refreshedSession))
    return getCurrentUser(refreshedSession.accessToken)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(readStoredSession()))

  function storeSession(session: StoredSession) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(session))
  }

  async function checkSession() {
    const session = readStoredSession()

    if (!session) {
      throw new Error('There is no stored session.')
    }

    try {
      const currentUser = await getUserWithRefresh(session)
      setUser(currentUser)
    } catch (error) {
      if (error instanceof AuthError) {
        localStorage.removeItem(sessionStorageKey)
        setUser(null)
      }

      throw error
    }
  }

  useEffect(() => {
    const session = readStoredSession()

    if (!session) {
      return
    }

    getUserWithRefresh(session)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(sessionStorageKey)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  async function login(username: string, password: string) {
    const result = await loginUser(username, password)
    storeSession(result.session)
    setUser(result.user)
  }

  function logout() {
    localStorage.removeItem(sessionStorageKey)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, checkSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
