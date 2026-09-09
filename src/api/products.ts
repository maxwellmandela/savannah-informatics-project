import { authenticatedFetch } from './auth'

export type Product = {
  id: number
  title: string
  category: string
  stock: number
  price: number
  thumbnail: string
}

export type ProductResponse = {
  products: Product[]
  total: number
  skip: number
  limit: number
}

export type Category = {
  slug: string
  name: string
  url: string
}

export type ProductFilters = {
  query: string
  category: string
  sortBy: string
  order: string
  page: number
}

const PAGE_SIZE = 10

export async function getProducts(
  filters: ProductFilters,
  signal?: AbortSignal,
): Promise<ProductResponse> {
  const { query, category, sortBy, order, page } = filters
  const searchParams = new URLSearchParams({
    limit: String(PAGE_SIZE),
    skip: String((page - 1) * PAGE_SIZE),
  })

  if (query) {
    searchParams.set('q', query)
  }

  if (sortBy) {
    searchParams.set('sortBy', sortBy)
    searchParams.set('order', order)
  }

  const path = query
    ? '/products/search'
    : category
      ? `/products/category/${encodeURIComponent(category)}`
      : '/products'

  const response = await authenticatedFetch(`${path}?${searchParams.toString()}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error('Stock could not be loaded. Please try again.')
  }

  return (await response.json()) as ProductResponse
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await authenticatedFetch('/products/categories', {
    signal,
  })

  if (!response.ok) {
    throw new Error('Categories could not be loaded. Please try again.')
  }

  return (await response.json()) as Category[]
}

export async function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  const response = await authenticatedFetch(`/products/${encodeURIComponent(id)}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error('This stock item could not be loaded. Please try again.')
  }

  return (await response.json()) as Product
}

export async function updateProductStock(id: number, stock: number): Promise<Product> {
  const response = await authenticatedFetch(`/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stock }),
  })

  if (!response.ok) {
    throw new Error('Stock could not be corrected. Please try again.')
  }

  return (await response.json()) as Product
}

export { PAGE_SIZE }
