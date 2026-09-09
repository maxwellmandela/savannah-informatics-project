import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getProduct, updateProductStock } from '../api/products'

export function ItemDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [stockInput, setStockInput] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => getProduct(id, signal),
    enabled: Boolean(id),
  })
  const updateMutation = useMutation({
    mutationFn: (stock: number) => updateProductStock(Number(id), stock),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(['product', id], updatedProduct)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setStockInput(String(updatedProduct.stock))
      setSuccessMessage('Stock count updated.')
      setFormError('')
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Stock could not be corrected.',
      )
      setSuccessMessage('')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextStock = Number(stockInput ?? productQuery.data?.stock)

    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setFormError('Enter a whole number of zero or more.')
      setSuccessMessage('')
      return
    }

    setFormError('')
    setSuccessMessage('')
    updateMutation.mutate(nextStock)
  }

  if (productQuery.isLoading) {
    return <p role="status">Loading stock item...</p>
  }

  if (productQuery.isError) {
    return (
      <div className="error-state" role="alert">
        <p>{productQuery.error.message}</p>
        <button type="button" onClick={() => productQuery.refetch()}>
          Try again
        </button>
        <p>
          <Link to="/items">Return to stock</Link>
        </p>
      </div>
    )
  }

  if (!productQuery.data) {
    return <p role="status">This stock item was not found.</p>
  }

  const product = productQuery.data

  return (
    <section>
      <p>
        <Link to="/items">Back to stock</Link>
      </p>
      <p className="eyebrow">Stock item {product.id}</p>
      <h1>{product.title}</h1>
      <div className="detail-layout">
        <div className="product-detail">
          <img src={product.thumbnail} alt="" width="240" height="240" />
          <p>{product.category}</p>
          <p>
            Current stock: <strong>{product.stock}</strong>
          </p>
          <p>Price: ${product.price}</p>
        </div>

        <form className="correction-form" onSubmit={handleSubmit}>
          <h2>Correct stock count</h2>
          <label htmlFor="stock">New stock count</label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            value={stockInput ?? product.stock}
            onChange={(event) => setStockInput(event.target.value)}
            disabled={updateMutation.isPending}
            required
          />
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          {successMessage && (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          )}
          <button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save stock count'}
          </button>
        </form>
      </div>
    </section>
  )
}
