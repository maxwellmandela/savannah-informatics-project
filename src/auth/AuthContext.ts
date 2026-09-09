import { createContext } from 'react'
import type { AuthUser } from '../api/auth'

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  checkSession: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)