import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionStorageKey } from './auth'
import { getProducts } from './products'
import '../test/setup'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('getProducts', () => {
  it('builds the search URL with pagination and sorting', async () => {
    localStorage.setItem(
      sessionStorageKey,
      JSON.stringify({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ products: [], total: 0, skip: 10, limit: 10 }), {
        status: 200,
      }),
    )

    await getProducts({
      query: 'phone case',
      category: '',
      sortBy: 'title',
      order: 'desc',
      page: 2,
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://dummyjson.com/products/search?limit=10&skip=10&q=phone+case&sortBy=title&order=desc',
    )
    expect(options?.headers).toEqual({ Authorization: 'Bearer access-token' })
  })
})
