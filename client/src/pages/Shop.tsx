import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Product {
  id: number
  title: string
  imageUrl: string
  description: string
  brand?: string
  productType?: string
  listings: {
    storeName: string
    buyLink: string
    country: string
  }[]
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("All")
  const [selectedBrand, setSelectedBrand] = useState("All")
  const [selectedType, setSelectedType] = useState("All")
  const [page, setPage] = useState(1)
  const perPage = 12
  const isAdmin = sessionStorage.getItem("admin") === "true"
  const navigate = useNavigate()

  useEffect(() => {
  fetch(`${API}/products`)
    .then(res => res.json())
    .then(data => {
      setProducts(data.reverse()) // 👈 reverses the array to show newest first
    })
    .catch(err => {
      console.error("❌ Failed to fetch products:", err)
    })
}, [])

  const allCountries = Array.from(
    new Set(products.flatMap(p => p.listings.map(l => l.country)))
  )
  const allBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)))
  const allTypes = Array.from(new Set(products.map(p => p.productType).filter(Boolean)))

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) &&
    (selectedCountry === "All" || p.listings.some(l => l.country === selectedCountry)) &&
    (selectedBrand === "All" || p.brand === selectedBrand) &&
    (selectedType === "All" || p.productType === selectedType)
  )

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    await fetch(`${API}/products/${id}`, { method: "DELETE" })
    setProducts(products.filter(p => p.id !== id))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-center w-full">Shop</h1>
        {isAdmin && (
          <Link to="/add-product" className="btn btn-primary absolute right-6">
            + Add Product
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="select select-bordered"
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

        <select
          className="select select-bordered"
          value={selectedBrand}
          onChange={e => {
            setSelectedBrand(e.target.value)
            setPage(1)
          }}
        >
          <option value="All">All Brands</option>
          {allBrands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          className="select select-bordered"
          value={selectedType}
          onChange={e => {
            setSelectedType(e.target.value)
            setPage(1)
          }}
        >
          <option value="All">All Product Types</option>
          {allTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {paginated.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {paginated.map(product => (
            <div key={product.id} className="card bg-base-100 shadow p-4 flex flex-col">
              <img
                src={product.imageUrl || "/fallback.jpg"}
                alt={product.title}
                className="w-full h-48 object-contain cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              />

              <div className="mt-4 mb-2 min-h-[3.5rem]">
                <h2 className="text-lg font-semibold text-center line-clamp-2">
                  {product.title}
                </h2>
              </div>

              <button
                className="btn btn-outline btn-sm w-full mt-auto"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                View Stores
              </button>

              {isAdmin && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => navigate(`/edit-product/${product.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => deleteProduct(product.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2 items-center">
          <button
            className="btn btn-sm"
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            ⬅️ Prev
          </button>

          <span className="px-4 text-sm font-medium">
            Page {page} of {totalPages}
          </span>

          <button
            className="btn btn-sm"
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next ➡️
          </button>
        </div>
      )}
    </div>
  )
}
