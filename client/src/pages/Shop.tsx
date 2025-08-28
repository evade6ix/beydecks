import { useEffect, useMemo, useState, useDeferredValue, } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search as SearchIcon,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Share2,
  ExternalLink,
  Globe2,
  Store as StoreIcon,
  RefreshCw,
  Grid as GridIcon,
  List as ListIcon,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* ------------------------------
   Types
---------------------------------*/
interface Listing {
  storeName: string
  buyLink: string
  country: string // e.g. "Canada" | "USA"
}

interface Product {
  id: number
  title: string
  imageUrl: string
  description: string
  brand?: string
  productType?: string
  listings: Listing[]
}

// Helper: country -> flag
const flag = (country?: string) => {
  const c = String(country || "").toLowerCase()
  if (c.includes("canada")) return "🇨🇦"
  if (c.includes("united states") || c.includes("usa") || c.includes("u.s.")) return "🇺🇸"
  if (c.includes("japan")) return "🇯🇵"
  if (c.includes("uk") || c.includes("united kingdom") || c.includes("britain")) return "🇬🇧"
  return "🌍"
}

// Helper: nice number with commas
const fmt = (n: number) => n.toLocaleString()

// Debounce hook for inputs
function useDebounced<T>(value: T, delay = 150) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function Shop() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isAdmin = sessionStorage.getItem("admin") === "true"

  // --- State
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters (seed from URL if present)
  const [search, setSearch] = useState(params.get("q") || "")
  const [selectedCountry, setSelectedCountry] = useState(params.get("country") || "All")
  const [selectedBrand, setSelectedBrand] = useState(params.get("brand") || "All")
  const [selectedType, setSelectedType] = useState(params.get("type") || "All")
  const [sort, setSort] = useState<"new" | "az" | "za" | "brand" | "type">(
    (params.get("sort") as any) || "new"
  )
  const [view, setView] = useState<"grid" | "list">((params.get("view") as any) || "grid")

  const perPageFromUrl = Number(params.get("pp"))
  const [perPage, setPerPage] = useState(Number.isFinite(perPageFromUrl) && perPageFromUrl > 0 ? perPageFromUrl : 12)

  const pageFromUrl = Number(params.get("page"))
  const [page, setPage] = useState(Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1)

  // --- Fetch
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`${API}/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Network error")
        return r.json()
      })
      .then((data: Product[]) => {
        if (!alive) return
        // default newest-first if server returns oldest-first
        const normalized = Array.isArray(data) ? [...data].reverse() : []
        setProducts(normalized)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        console.error("❌ Failed to fetch products:", err)
        setError("Failed to load products. Try again.")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // Derived facets
  const allCountries = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.listings.map((l) => l.country)))).sort(),
    [products]
  )
  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort() as string[],
    [products]
  )
  const allTypes = useMemo(
    () => Array.from(new Set(products.map((p) => p.productType).filter(Boolean))).sort() as string[],
    [products]
  )

  // Filtering + sorting
  const deferredSearch = useDeferredValue(search)
  const debouncedSearch = useDebounced(deferredSearch, 120)

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    let arr = products.filter((p) => {
      const matchesQuery = !q || p.title.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q)
      const matchesCountry = selectedCountry === "All" || p.listings.some((l) => l.country === selectedCountry)
      const matchesBrand = selectedBrand === "All" || p.brand === selectedBrand
      const matchesType = selectedType === "All" || p.productType === selectedType
      return matchesQuery && matchesCountry && matchesBrand && matchesType
    })

    switch (sort) {
      case "az":
        arr.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "za":
        arr.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "brand":
        arr.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""))
        break
      case "type":
        arr.sort((a, b) => (a.productType || "").localeCompare(b.productType || ""))
        break
      default:
        // "new" — relies on reverse order from fetch
        break
    }
    return arr
  }, [products, debouncedSearch, selectedCountry, selectedBrand, selectedType, sort])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage, perPage]
  )

  // Keep URL in sync (no reload)
  useEffect(() => {
    const next = new URLSearchParams()
    if (search) next.set("q", search)
    if (selectedCountry !== "All") next.set("country", selectedCountry)
    if (selectedBrand !== "All") next.set("brand", selectedBrand)
    if (selectedType !== "All") next.set("type", selectedType)
    if (sort !== "new") next.set("sort", sort)
    if (view !== "grid") next.set("view", view)
    if (perPage !== 12) next.set("pp", String(perPage))
    if (currentPage !== 1) next.set("page", String(currentPage))
    setParams(next, { replace: true })
  }, [search, selectedCountry, selectedBrand, selectedType, sort, view, perPage, currentPage, setParams])

  // Actions
  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    await fetch(`${API}/products/${id}`, { method: "DELETE" })
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const clearFilters = () => {
    setSelectedCountry("All")
    setSelectedBrand("All")
    setSelectedType("All")
    setSort("new")
    setPage(1)
  }

  const copyLink = (id: number) => {
    const url = `${location.origin}/product/${id}`
    navigator.clipboard.writeText(url).then(() => {
      // Optional toast (daisyUI) if available
      // @ts-ignore
      if (window?.toast) window.toast.success("Link copied")
    })
  }

  /* ------------------------------
     UI
  ---------------------------------*/
  return (
    <div className="relative">
      {/* Soft gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40%_60%_at_20%_0%,rgba(99,102,241,.25),transparent),radial-gradient(30%_40%_at_100%_20%,rgba(34,197,94,.18),transparent),radial-gradient(40%_40%_at_50%_100%,rgba(244,114,182,.16),transparent)]" />

      {/* Hero / toolbar */}
      <section className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-base-100/70 bg-base-100/90 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">Shop</h1>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                className={`btn btn-sm ${view === "grid" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
              {isAdmin && (
                <Link to="/add-product" className="btn btn-sm btn-primary">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Product</span>
                </Link>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-4">
              <label className="input input-bordered flex items-center gap-2">
                <SearchIcon className="h-4 w-4 opacity-60" />
                <input
                  type="text"
                  className="grow"
                  placeholder="Search products, brands... ( / to focus )"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "/") {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).focus()
                    }
                  }}
                />
              </label>
            </div>

            {/* Country */}
            <div className="md:col-span-2">
              <select
                className="select select-bordered w-full"
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value)
                  setPage(1)
                }}
              >
                <option value="All">All Countries</option>
                {allCountries.map((c) => (
                  <option key={c} value={c}>
                    {flag(c)} {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="md:col-span-2">
              <select
                className="select select-bordered w-full"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value)
                  setPage(1)
                }}
              >
                <option value="All">All Brands</option>
                {allBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="md:col-span-2">
              <select
                className="select select-bordered w-full"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="All">All Product Types</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-2 flex gap-2">
              <select
                className="select select-bordered w-full"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                aria-label="Sort by"
              >
                <option value="new">Newest</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="brand">Brand</option>
                <option value="type">Type</option>
              </select>
              <button className="btn btn-ghost" onClick={clearFilters} title="Clear filters">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active filters chips */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="opacity-70">{fmt(filtered.length)} result{filtered.length !== 1 ? "s" : ""}</span>
            {search && (
              <button className="badge badge-outline gap-1" onClick={() => setSearch("")}> 
                <X className="h-3 w-3" /> q: {search}
              </button>
            )}
            {selectedCountry !== "All" && (
              <button className="badge badge-outline gap-1" onClick={() => setSelectedCountry("All")}>
                <X className="h-3 w-3" /> {flag(selectedCountry)} {selectedCountry}
              </button>
            )}
            {selectedBrand !== "All" && (
              <button className="badge badge-outline gap-1" onClick={() => setSelectedBrand("All")}>
                <X className="h-3 w-3" /> {selectedBrand}
              </button>
            )}
            {selectedType !== "All" && (
              <button className="badge badge-outline gap-1" onClick={() => setSelectedType("All")}>
                <X className="h-3 w-3" /> {selectedType}
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Loading / Error States */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: perPage }).map((_, i) => (
              <div key={i} className="card bg-base-100/50 border border-base-200 shadow-sm animate-pulse">
                <div className="h-48 w-full bg-base-300/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 bg-base-300/60" />
                  <div className="h-3 w-1/2 bg-base-300/60" />
                  <div className="h-9 w-full bg-base-300/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error max-w-2xl mx-auto">
            <span>{error}</span>
            <button className="btn btn-sm" onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {paginated.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-base-content/70">No products found.</p>
                <div className="mt-4">
                  <button className="btn btn-primary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {paginated.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.02 }}
                      className="group card bg-base-100/80 border border-base-200 shadow-xl hover:shadow-2xl transition-shadow duration-300"
                    >
                      <figure className="relative overflow-hidden">
                        <img
                          src={product.imageUrl || "/fallback.jpg"}
                          alt={product.title}
                          className="h-48 w-full object-contain p-3 bg-base-200/40 group-hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                          onClick={() => navigate(`/product/${product.id}`)}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-base-100/20" />
                        {/* Quick actions */}
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="btn btn-xs btn-ghost" title="Share" onClick={() => copyLink(product.id)}>
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <a className="btn btn-xs btn-ghost" title="Open" onClick={() => navigate(`/product/${product.id}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </figure>

                      <div className="card-body p-4">
                        <h2 className="card-title text-base sm:text-lg leading-tight min-h-[2.5rem] line-clamp-2">
                          {product.title}
                        </h2>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {product.brand && <span className="badge badge-neutral">{product.brand}</span>}
                          {product.productType && <span className="badge badge-outline">{product.productType}</span>}
                        </div>

                        {/* Stores summary */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="inline-flex items-center gap-1 opacity-80">
                            <StoreIcon className="h-4 w-4" /> {product.listings.length} store{product.listings.length !== 1 ? "s" : ""}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(
                              new Map(product.listings.map((l) => [l.country, (product.listings.filter((x) => x.country === l.country).length)]))
                            ).map(([country, count]) => (
                              <span key={`${product.id}-${String(country)}`} className="badge badge-ghost">
                                {flag(String(country))} {String(country)} × {count}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/product/${product.id}`)}>
                            View Stores
                          </button>
                          {isAdmin ? (
                            <div className="flex gap-2">
                              <button className="btn btn-warning btn-sm w-full" onClick={() => navigate(`/edit-product/${product.id}`)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button className="btn btn-error btn-sm w-full" onClick={() => deleteProduct(product.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <a
                              href={product.listings?.[0]?.buyLink || `#/product/${product.id}`}
                              target={product.listings?.[0]?.buyLink ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                            >
                              Buy Now
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              // List view
              <div className="divide-y divide-base-300 rounded-xl border border-base-300 bg-base-100/70">
                {paginated.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row gap-4 p-4 items-center sm:items-stretch">
                    <img
                      src={p.imageUrl || "/fallback.jpg"}
                      alt={p.title}
                      className="h-28 w-28 object-contain rounded-md bg-base-200/50 p-2"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold line-clamp-1">{p.title}</h3>
                        <div className="hidden sm:flex gap-2">
                          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/product/${p.id}`)}>
                            View Stores
                          </button>
                          {isAdmin ? (
                            <>
                              <button className="btn btn-warning btn-sm" onClick={() => navigate(`/edit-product/${p.id}`)}>
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button className="btn btn-error btn-sm" onClick={() => deleteProduct(p.id)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <a
                              href={p.listings?.[0]?.buyLink || `#/product/${p.id}`}
                              target={p.listings?.[0]?.buyLink ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                            >
                              Buy Now
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm opacity-80">
                        {p.brand && <span className="badge badge-neutral">{p.brand}</span>}
                        {p.productType && <span className="badge badge-outline">{p.productType}</span>}
                        <span className="inline-flex items-center gap-1">
                          <StoreIcon className="h-4 w-4" /> {p.listings.length} stores
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Globe2 className="h-4 w-4" /> {Array.from(new Set(p.listings.map((l) => l.country))).map((c) => `${flag(c)} ${c}`).join(" · ")}
                        </span>
                      </div>
                    </div>
                    <div className="sm:hidden grid grid-cols-2 gap-2 w-full">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/product/${p.id}`)}>
                        View Stores
                      </button>
                      {isAdmin ? (
                        <>
                          <button className="btn btn-warning btn-sm" onClick={() => navigate(`/edit-product/${p.id}`)}>
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button className="btn btn-error btn-sm" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <a
                          href={p.listings?.[0]?.buyLink || `#/product/${p.id}`}
                          target={p.listings?.[0]?.buyLink ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          Buy Now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="opacity-70">
                    Showing {fmt((currentPage - 1) * perPage + 1)}–{fmt(Math.min(currentPage * perPage, filtered.length))} of {fmt(filtered.length)}
                  </span>
                  <select
                    className="select select-bordered select-sm"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    {[12, 24, 48].map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                </div>

                <div className="join">
                  <button className="btn join-item btn-sm" onClick={() => setPage(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="btn join-item btn-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="join-item px-3 text-sm">Page {currentPage} / {totalPages}</span>
                  <button
                    className="btn join-item btn-sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    className="btn join-item btn-sm"
                    onClick={() => setPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Admin floating action */}
      {isAdmin && (
        <div className="fixed bottom-5 right-5 z-30">
          <Link to="/add-product" className="btn btn-primary btn-circle shadow-2xl">
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  )
}
