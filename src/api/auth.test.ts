import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticatedFetch, sessionStorageKey } from './auth'
import '../test/setup'

const initialSession = {
  accessToken: 'expired-access-token',
  refreshToken: 'valid-refresh-token',
}

const refreshedSession = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
}

function setStoredSession(session = initialSession) {
  localStorage.setItem(sessionStorageKey, JSON.stringify(session))
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('authenticatedFetch', () => {
  it('refreshes the session and retries once after a 401 response', async () => {
    setStoredSession()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(refreshedSession), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const response = await authenticatedFetch('/products/1')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer expired-access-token',
    })
    expect(fetchMock.mock.calls[2][1]?.headers).toEqual({
      Authorization: 'Bearer new-access-token',
    })
    expect(localStorage.getItem(sessionStorageKey)).toBe(
      JSON.stringify(refreshedSession),
    )
  })

  it('removes the session when refreshing fails', async () => {
    setStoredSession()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(authenticatedFetch('/products/1')).rejects.toThrow()
    expect(localStorage.getItem(sessionStorageKey)).toBeNull()
  })
})
