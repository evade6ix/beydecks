import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Globe2, Copy, Check, Store, Share2, ShieldCheck, ExternalLink } from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

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

// --- helpers ---
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ")
const flag = (country?: string) => {
  const c = (country || "").toLowerCase()
  if (c.includes("canada")) return "🇨🇦"
  if (c.includes("united states") || c === "usa" || c.includes("us")) return "🇺🇸"
  if (c.includes("uk") || c.includes("united kingdom")) return "🇬🇧"
  return "🌍"
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const perPage = 8
  const [selectedCountry, setSelectedCountry] = useState("All")
  const [copied, setCopied] = useState(false)

  // fetch
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Product) => {
        setProduct(data)
        setError(null)
      })
      .catch((err) => {
        console.error("Failed to fetch product:", err)
        setError("Failed to load product. Try again.")
      })
      .finally(() => setLoading(false))
  }, [id])

  // early states
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-7 w-56 rounded bg-white/10 animate-pulse" />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-[4/3] w-full rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-3/4 rounded bg-white/10 animate-pulse" />
            <div className="h-28 w-full rounded-xl bg-white/10 animate-pulse" />
            <div className="h-10 w-40 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg font-medium">{error || "Product not found."}</p>
        <button className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    )
  }

// after the early-return and absoluteImage:
const absoluteImage = product.imageUrl?.startsWith("data:")
  ? product.imageUrl
  : `${API}${product.imageUrl}`

// ✅ Memoized derived values
const countries = useMemo(
  () => Array.from(new Set(product.listings.map(l => l.country))),
  [product.listings]
)

const filteredListings = useMemo(
  () =>
    selectedCountry === "All"
      ? product.listings
      : product.listings.filter(l => l.country === selectedCountry),
  [product.listings, selectedCountry]
)

const totalPages = useMemo(
  () => Math.ceil((filteredListings.length || 0) / perPage) || 1,
  [filteredListings.length, perPage]
)

const paginated = useMemo(
  () => filteredListings.slice((page - 1) * perPage, page * perPage),
  [filteredListings, page]
)


  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/shop/${product.id}` : `https://www.metabeys.com/shop/${product.id}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const handleShare = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: product.title, text: product.description, url: shareUrl })
      } else {
        await handleCopy()
      }
    } catch {}
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: absoluteImage,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    additionalType: product.productType,
    url: shareUrl,
    offers: {
      "@type": "AggregateOffer",
      offerCount: product.listings?.length || 0,
      priceCurrency: "USD",
      lowPrice: undefined,
      highPrice: undefined,
      seller: undefined,
    },
  }

  return (
    <>
      <Helmet>
        <title>{product.title} — MetaBeys Shop</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={`${product.title} — MetaBeys Shop`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={absoluteImage} />
        <meta property="og:url" content={shareUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={shareUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        {/* breadcrumb */}
        <div className="mb-3 flex items-center gap-2 text-sm opacity-80">
          <Link to="/shop" className="hover:underline">Shop</Link>
          <span>/</span>
          <span className="line-clamp-1">{product.title}</span>
        </div>

        {/* top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* gallery */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5">
              <img src={absoluteImage} alt={product.title} className="h-full w-full object-contain" loading="eager" />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
          </motion.div>

          {/* info */}
          <div>
            <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-semibold">
              {product.title}
            </motion.h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {product.brand && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{product.brand}</span>}
              {product.productType && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{product.productType}</span>}
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                <Store className="mr-1 inline h-3.5 w-3.5" /> {product.listings?.length || 0} stores
              </span>
            </div>

            <p className="mt-4 text-sm opacity-90 whitespace-pre-line">{product.description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                <ArrowLeft className="h-4 w-4" /> Back to Shop
              </button>
              <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>

            {/* country filter */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm">
                <Globe2 className="h-4 w-4 opacity-70" />
                <span className="opacity-80">Filter stores by country</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedCountry("All"); setPage(1) }}
                  className={cn("px-3 py-1.5 rounded-2xl text-sm border", selectedCountry === "All" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/5 border-white/10 hover:bg-white/10")}
                >
                  🌍 All Countries
                </button>
                {countries.map((c) => (
                  <button key={c} onClick={() => { setSelectedCountry(c); setPage(1) }} className={cn("px-3 py-1.5 rounded-2xl text-sm border", selectedCountry === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/5 border-white/10 hover:bg-white/10")}> {flag(c)} {c}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* listings */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Available Stores</h2>
            <p className="text-sm opacity-70">{filteredListings.length} result{filteredListings.length !== 1 ? "s" : ""}</p>
          </div>

          {filteredListings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-sm">No stores in this country yet. Try another filter.</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {paginated.map((l, i) => (
                  <motion.div
                    key={l.buyLink + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: Math.min(i * 0.03, 0.12) }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold leading-6">{l.storeName}</div>
                        <div className="mt-0.5 text-xs opacity-80">{flag(l.country)} {l.country}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified link
                      </span>
                    </div>

                    <div className="mt-3">
                      <a
                        href={l.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
                      >
                        <ExternalLink className="h-4 w-4" /> Buy from {l.storeName}
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* pagination */}
          {filteredListings.length > perPage && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40">Prev</button>
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                const n = i + 1
                return (
                  <button key={n} onClick={() => setPage(n)} className={cn("h-8 w-8 rounded-lg text-sm", n === page ? "bg-white/15" : "hover:bg-white/10")}>{n}</button>
                )
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
