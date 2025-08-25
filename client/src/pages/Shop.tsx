import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Store as StoreIcon,
  Globe2,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  X,
  Plus,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* --------------------------------
   Types
---------------------------------*/
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
    country: string // "Canada" | "USA" | etc
  }[]
}

type SortBy = "Newest" | "Name (A → Z)" | "Name (Z → A)" | "Brand (A → Z)"

type ViewMode = "grid" | "list"

/* --------------------------------
   Helpers
---------------------------------*/
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ")
const normalize = (s?: string) => (s || "").toLowerCase().trim()

/* --------------------------------
   Component
---------------------------------*/
export default function Shop() {
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Controls
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("All")
  const [selectedBrand, setSelectedBrand] = useState<string>("All")
  const [selectedType, setSelectedType] = useState<string>("All")
  const [sortBy, setSortBy] = useState<SortBy>("Newest")
  const [view, setView] = useState<ViewMode>("grid")

  const [page, setPage] = useState(1)
  const perPage = 12

  const isAdmin = sessionStorage.getItem("admin") === "true"
  const navigate = useNavigate()

  /* --------------------------------
     Effects
  ---------------------------------*/
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/products`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Product[]) => {
        // newest first
        setProducts([...(data || [])].reverse())
        setError(null)
      })
      .catch((err) => {
        console.error("❌ Failed to fetch products:", err)
        setError("Failed to load products. Please try again.")
      })
      .finally(() => setLoading(false))
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [debounced, selectedCountry, selectedBrand, selectedType, sortBy])

  /* --------------------------------
     Derived lists
  ---------------------------------*/
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

  /* --------------------------------
     Filtering + Sorting
  ---------------------------------*/
  const filtered = useMemo(() => {
    const q = normalize(debounced)

    let out = products.filter((p) => {
      const matchesSearch = !q || normalize(p.title).includes(q) || normalize(p.description).includes(q)
      const matchesCountry = selectedCountry === "All" || p.listings.some((l) => l.country === selectedCountry)
      const matchesBrand = selectedBrand === "All" || p.brand === selectedBrand
      const matchesType = selectedType === "All" || p.productType === selectedType
      return matchesSearch && matchesCountry && matchesBrand && matchesType
    })

    out.sort((a, b) => {
      switch (sortBy) {
        case "Name (A → Z)":
          return a.title.localeCompare(b.title)
        case "Name (Z → A)":
          return b.title.localeCompare(a.title)
        case "Brand (A → Z)": {
          const aa = a.brand || "zzz"
          const bb = b.brand || "zzz"
          return aa.localeCompare(bb) || a.title.localeCompare(b.title)
        }
        case "Newest":
        default:
          return 0 // already newest first from API/reverse
      }
    })

    return out
  }, [products, debounced, selectedCountry, selectedBrand, selectedType, sortBy])

  const totalPages = Math.ceil(filtered.length / perPage) || 1
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page])

  /* --------------------------------
     Actions
  ---------------------------------*/
  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return
    await fetch(`${API}/products/${id}`, { method: "DELETE" })
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const resetFilters = () => {
    setSearch("")
    setSelectedCountry("All")
    setSelectedBrand("All")
    setSelectedType("All")
    setSortBy("Newest")
  }

  /* --------------------------------
     UI Subcomponents
  ---------------------------------*/
  const Pill = ({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-2xl text-sm transition border",
        active ? "bg-indigo-600 text-white border-indigo-600 shadow" : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  )

  const SelectBox = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="opacity-70">{label}</span>
      <div className="relative">
        <select
          className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-8 text-sm hover:bg-white/10 focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
      </div>
    </label>
  )

  const ActiveFilterChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
    <motion.button
      layout
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
    >
      <X className="h-3 w-3" /> {label}
    </motion.button>
  )

  /* --------------------------------
     Render
  ---------------------------------*/
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-emerald-500/10 ring-1 ring-white/10 p-6 md:p-10">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-4xl font-semibold tracking-tight"
        >
          Shop
        </motion.h1>
        <p className="mt-2 max-w-2xl text-sm md:text-base opacity-80">
          Curated Beyblade X products with direct buy links across Canada and the USA. Filter by country, brand, and type.
        </p>
        {isAdmin && (
          <Link
            to="/add-product"
            className="absolute right-4 top-4 md:right-6 md:top-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        )}

        {/* Toolbar */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search */}
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
              <input
                type="text"
                placeholder="Search products, descriptions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:opacity-60 hover:bg-white/10 focus:outline-none"
              />
            </div>
          </div>

          {/* Country quick pills */}
          <div className="md:col-span-4 flex items-center gap-2 overflow-x-auto">
            <Pill active={selectedCountry === "All"} onClick={() => setSelectedCountry("All")}>
              <Globe2 className="mr-1 inline h-4 w-4" /> All Countries
            </Pill>
            {allCountries.map((c) => (
              <Pill key={c} active={selectedCountry === c} onClick={() => setSelectedCountry(c)}>
                {c}
              </Pill>
            ))}
          </div>

          {/* Sort + View */}
          <div className="md:col-span-3 flex items-center justify-end gap-3">
            <SelectBox
              label="Sort"
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              options={["Newest", "Name (A → Z)", "Name (Z → A)", "Brand (A → Z)"]}
            />
            <div className="hidden md:flex items-center rounded-xl border border-white/10 overflow-hidden">
              <button
                aria-label="Grid view"
                onClick={() => setView("grid")}
                className={cn("px-2.5 py-2", view === "grid" ? "bg-white/10" : "hover:bg-white/5")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                aria-label="List view"
                onClick={() => setView("list")}
                className={cn("px-2.5 py-2", view === "list" ? "bg-white/10" : "hover:bg-white/5")}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 opacity-60" />
          <SelectBox label="Brand" value={selectedBrand} onChange={setSelectedBrand} options={["All", ...allBrands]} />
          <SelectBox label="Type" value={selectedType} onChange={setSelectedType} options={["All", ...allTypes]} />

          {/* Active filter chips */}
          <AnimatePresence>
            {selectedCountry !== "All" && (
              <ActiveFilterChip key="c" label={`Country: ${selectedCountry}`} onClear={() => setSelectedCountry("All")} />
            )}
            {selectedBrand !== "All" && (
              <ActiveFilterChip key="b" label={`Brand: ${selectedBrand}`} onClear={() => setSelectedBrand("All")} />
            )}
            {selectedType !== "All" && (
              <ActiveFilterChip key="t" label={`Type: ${selectedType}`} onClear={() => setSelectedType("All")} />
            )}
            {(selectedCountry !== "All" || selectedBrand !== "All" || selectedType !== "All" || debounced) && (
              <button onClick={resetFilters} className="text-xs underline opacity-80 hover:opacity-100">
                Reset all
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {/* Loading / Error / Empty */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
                <div className="h-44 w-full rounded-xl bg-white/10" />
                <div className="mt-4 h-4 w-4/5 rounded bg-white/10" />
                <div className="mt-2 h-4 w-2/5 rounded bg-white/10" />
                <div className="mt-6 h-9 w-full rounded-xl bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center">
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-medium">No products match your filters.</p>
            <p className="mt-1 text-sm opacity-70">Try broadening your search or resetting filters.</p>
            <button onClick={resetFilters} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Reset filters
            </button>
          </div>
        )}

        {/* List view */}
        {!loading && !error && filtered.length > 0 && view === "list" && (
          <div className="space-y-4">
            {paginated.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <img
                  src={p.imageUrl || "/fallback.jpg"}
                  alt={p.title}
                  loading="lazy"
                  className="h-28 w-28 flex-none rounded-xl object-contain ring-1 ring-white/10 bg-white/5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-6 line-clamp-1">{p.title}</h3>
                    <div className="flex items-center gap-1 text-xs opacity-80">
                      <StoreIcon className="h-4 w-4" /> {p.listings?.length || 0} stores
                    </div>
                  </div>
                  <p className="mt-1 text-sm opacity-80 line-clamp-2">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {p.brand && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{p.brand}</span>}
                    {p.productType && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{p.productType}</span>
                    )}
                    {Array.from(new Set(p.listings?.map((l) => l.country))).map((c) => (
                      <span key={c} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                    >
                      View stores
                    </button>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => navigate(`/edit-product/${p.id}`)} className="rounded-lg bg-amber-500/90 px-2 py-1 text-xs text-white hover:bg-amber-500">
                      Edit
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="rounded-lg bg-rose-600/90 px-2 py-1 text-xs text-white hover:bg-rose-600">
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Grid view */}
        {!loading && !error && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginated.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.12) }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4 hover:shadow-xl hover:shadow-indigo-600/10"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-white/5">
                  <img
                    src={p.imageUrl || "/fallback.jpg"}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                    onClick={() => navigate(`/product/${p.id}`)}
                  />
                </div>

                <div className="mt-4 min-h-[3.25rem]">
                  <h3 className="text-base font-semibold leading-6 line-clamp-2">{p.title}</h3>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {p.brand && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{p.brand}</span>}
                  {p.productType && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{p.productType}</span>
                  )}
                  {Array.from(new Set(p.listings?.map((l) => l.country))).map((c) => (
                    <span key={c} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <StoreIcon className="h-4 w-4" /> {p.listings?.length || 0} stores
                  </div>
                  <button
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                  >
                    View stores
                  </button>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-xl bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                      onClick={() => navigate(`/edit-product/${p.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                      onClick={() => deleteProduct(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>

            <div className="inline-flex items-center gap-1">
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                const n = i + 1
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-sm",
                      n === page ? "bg-white/15" : "hover:bg-white/10"
                    )}
                  >
                    {n}
                  </button>
                )}
              )}
            </div>

            <button
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
