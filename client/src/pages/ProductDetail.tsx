import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Listing {
  storeName: string
  buyLink: string
  country: string
}

interface Product {
  id: number
  title: string
  imageUrl: string
  description: string
  listings: Listing[]
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [selectedCountry, setSelectedCountry] = useState("All")
  const perPage = 6

  useEffect(() => {
    fetch(`${API}/products/${id}`)
      .then(res => res.json())
      .then(setProduct)
      .catch(err => console.error("Failed to fetch product:", err))
  }, [id])

  if (!product) return <div className="p-6 text-center">Loading...</div>

  const allCountries = Array.from(new Set(product.listings.map(l => l.country)))
  const filteredListings =
    selectedCountry === "All"
      ? product.listings
      : product.listings.filter(l => l.country === selectedCountry)

  const totalPages = Math.ceil(filteredListings.length / perPage)
  const paginated = filteredListings.slice((page - 1) * perPage, page * perPage)

  const imageUrl = product.imageUrl.startsWith("data:")
    ? product.imageUrl
    : `${API}${product.imageUrl}`

  return (
    <>
      <Helmet>
        <title>{product.title} — Buy Beyblade Product</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={`${product.title} — Buy Beyblade Product`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={`https://www.metabeys.com/shop/${product.id}`} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">{product.title}</h1>

        <img
          src={imageUrl}
          alt={product.title}
          className="mx-auto max-h-64 object-contain"
        />

        <div className="border border-gray-600 rounded-lg p-4 bg-base-200 max-w-3xl mx-auto">
          <p className="text-center text-gray-300">{product.description}</p>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold mt-8 mb-2">
            {filteredListings.length} Store{filteredListings.length !== 1 && "s"} Available
          </h2>
          <select
            className="select select-bordered mt-2"
            value={selectedCountry}
            onChange={e => {
              setSelectedCountry(e.target.value)
              setPage(1)
            }}
          >
            <option value="All">All Countries</option>
            {allCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto max-w-3xl mx-auto">
          <table className="table w-full text-center">
            <thead>
              <tr>
                <th>Store</th>
                <th>Country</th>
                <th>Buy</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l, i) => (
                <tr key={i}>
                  <td>{l.storeName}</td>
                  <td>{l.country}</td>
                  <td>
                    <a
                      href={l.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      Buy Now
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="btn btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ⬅️ Prev
            </button>
            <span className="px-3 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next ➡️
            </button>
          </div>
        )}

        <div className="text-center">
          <button className="btn mt-6" onClick={() => navigate(-1)}>
            ← Back to Shop
          </button>
        </div>
      </div>
    </>
  )
}
