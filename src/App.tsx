import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/useAuth'
import { StockListPage } from './pages/StockListPage'
import { ItemDetailPage } from './pages/ItemDetailPage'

type LoginLocationState = {
  from?: {
    pathname?: string
    search?: string
  }
}

function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/items" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/items" element={<StockListPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('emilys')
  const [password, setPassword] = useState('emilyspass')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    const state = location.state as LoginLocationState | null
    const from = state?.from?.pathname ?? '/items'
    const search = state?.from?.search ?? ''

    return <Navigate to={`${from}${search}`} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(username, password)
      const state = location.state as LoginLocationState | null
      const from = state?.from?.pathname ?? '/items'
      const search = state?.from?.search ?? ''
      navigate(`${from}${search}`, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Clinic supplies</p>
      <h1>Sign in to view stock</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : error ? 'Try again' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/items">Return to stock</Link>
    </section>
  )
}

export default App
