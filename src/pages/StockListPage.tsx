import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { getCategories, getProducts, PAGE_SIZE } from '../api/products'
import { useAuth } from '../auth/useAuth'

const defaultSort = 'title'
const defaultOrder = 'asc'

export function StockListPage() {
  const { user, logout, checkSession } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [sessionMessage, setSessionMessage] = useState('')
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sortBy = searchParams.get('sortBy') ?? defaultSort
  const order = searchParams.get('order') ?? defaultOrder
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const filters = { query, category, sortBy, order, page }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)

        if (searchInput) nextParams.set('q', searchInput)
        else nextParams.delete('q')
        nextParams.set('page', '1')

        return nextParams
      })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput, setSearchParams])

  const productsQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => getProducts(filters, signal),
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 5 * 60 * 1000,
  })

  function updateParams(updates: Record<string, string>) {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    })

    setSearchParams(nextParams)
  }

  async function handleSessionCheck() {
    setSessionMessage('Checking session...')

    try {
      await checkSession()
      setSessionMessage('Session is valid.')
    } catch (error) {
      setSessionMessage(
        error instanceof Error ? error.message : 'Session check failed.',
      )
    }
  }

  const totalPages = productsQuery.data
    ? Math.ceil(productsQuery.data.total / PAGE_SIZE)
    : 0

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stock catalogue</p>
          <h1>Clinic stock</h1>
          <p>Signed in as {user?.firstName}.</p>
        </div>
        <div className="actions">
          <button type="button" onClick={handleSessionCheck}>
            Check session
          </button>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
      {sessionMessage && <p role="status">{sessionMessage}</p>}

      <div className="filters" aria-label="Stock filters">
        <label>
          Search
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search stock"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(event) =>
              updateParams({ category: event.target.value, page: '1' })
            }
          >
            <option value="">All categories</option>
            {categoriesQuery.data?.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={`${sortBy}-${order}`}
            onChange={(event) => {
              const [nextSort, nextOrder] = event.target.value.split('-')
              updateParams({ sortBy: nextSort, order: nextOrder, page: '1' })
            }}
          >
            <option value="title-asc">Name A to Z</option>
            <option value="title-desc">Name Z to A</option>
            <option value="id-asc">ID low to high</option>
            <option value="id-desc">ID high to low</option>
          </select>
        </label>
      </div>

      {productsQuery.isLoading && <p role="status">Loading stock...</p>}
      {productsQuery.isError && (
        <div className="error-state" role="alert">
          <p>{productsQuery.error.message}</p>
          <button type="button" onClick={() => productsQuery.refetch()}>
            Try again
          </button>
        </div>
      )}
      {productsQuery.isSuccess && productsQuery.data.products.length === 0 && (
        <p role="status">No stock matches these filters.</p>
      )}
      {productsQuery.isSuccess && productsQuery.data.products.length > 0 && (
        <>
          <ul className="product-list">
            {productsQuery.data.products.map((product) => (
              <li key={product.id} className="product-row">
                <img src={product.thumbnail} alt="" width="72" height="72" />
                <div>
                  <Link to={`/items/${product.id}`}>{product.title}</Link>
                  <p>
                    {product.category} | Stock: {product.stock}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="pagination" aria-label="Pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  )
}
