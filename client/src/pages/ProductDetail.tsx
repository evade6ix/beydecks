import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, } from "framer-motion"
import {
  ArrowLeft,
  ExternalLink,
  Store as StoreIcon,
  Globe2,
  Share2,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Listing {
  storeName: string
  buyLink: string
  country: string // e.g. "Canada" | "United States"
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
  if (c.includes("united states") || c.includes("usa")) return "🇺🇸"
  if (c.includes("united kingdom") || c.includes("uk")) return "🇬🇧"
  if (c.includes("japan")) return "🇯🇵"
  if (c.includes("france")) return "🇫🇷"
  if (c.includes("germany")) return "🇩🇪"
  return "🌍"
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [page, setPage] = useState(1)
  const [selectedCountry, setSelectedCountry] = useState<string>("All")
  const [copied, setCopied] = useState(false)
  const perPage = 8

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`${API}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => alive && setProduct(data))
      .catch((err) => alive && setError(`Failed to load product. ${err?.message || ""}`))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // derive image URL once product is present
  const imageUrl = useMemo(() => {
    if (!product) return ""
    return product.imageUrl?.startsWith("data:") ? product.imageUrl : `${API}${product.imageUrl}`
  }, [product])

  const allCountries = useMemo(() => {
    if (!product) return [] as string[]
    const uniq = Array.from(new Set(product.listings.map((l) => l.country).filter(Boolean)))
    return uniq.sort((a, b) => a.localeCompare(b))
  }, [product])

  const listingsFiltered = useMemo(() => {
    if (!product) return [] as Listing[]
    const base = selectedCountry === "All" ? product.listings : product.listings.filter((l) => l.country === selectedCountry)
    // stable sort: by country, then store name
    return [...base].sort((a, b) => {
      const byCountry = (a.country || "").localeCompare(b.country || "")
      if (byCountry !== 0) return byCountry
      return (a.storeName || "").localeCompare(b.storeName || "")
    })
  }, [product, selectedCountry])

  const totalPages = Math.ceil(listingsFiltered.length / perPage) || 1
  const paginated = listingsFiltered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    // reset to page 1 whenever country filter changes
    setPage(1)
  }, [selectedCountry])

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      console.error("Clipboard failed", e)
    }
  }

  const onShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      onCopyLink()
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-white/5 ring-1 ring-white/10" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 rounded-lg bg-white/5" />
            <div className="h-5 w-1/2 rounded bg-white/5" />
            <div className="h-28 w-full rounded-xl bg-white/5" />
            <div className="h-10 w-40 rounded-lg bg-white/5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button className="btn mt-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
      </div>
    )
  }

  if (!product) return null

  const pageTitle = `${product.title} — Buy Beyblade Product`
  const canonical = `https://www.metabeys.com/shop/${product.id}`

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={product.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="index, follow" />
        {/* Basic Product JSON-LD (no prices to avoid inaccuracies) */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description: product.description,
            image: imageUrl,
            brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
            url: canonical,
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-600/20 via-fuchsia-500/10 to-transparent blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/15 hover:ring-white/30 transition"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Image card */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-6 backdrop-blur-sm"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-black/20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={product.title}
                  loading="lazy"
                  className="h-full w-full object-contain hover:scale-[1.02] transition"
                  draggable={false}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{product.title}</h1>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm btn-ghost" onClick={onShare}>
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={onCopyLink}>
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}Copy
                  </button>
                </div>
              </div>
              {product.brand || product.productType ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {product.brand && (
                    <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Brand: {product.brand}</span>
                  )}
                  {product.productType && (
                    <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Type: {product.productType}</span>
                  )}
                </div>
              ) : null}

              <p className="mt-4 text-sm md:text-base leading-relaxed text-white/80 whitespace-pre-line">
                {product.description}
              </p>
            </motion.div>

            {/* Offers / Stores */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold">Available Stores</h2>
                <div className="text-sm text-white/70">{listingsFiltered.length} result{listingsFiltered.length !== 1 && "s"}</div>
              </div>

              {/* Country filter chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCountry("All")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm ring-1 transition",
                    selectedCountry === "All"
                      ? "bg-indigo-500/20 ring-indigo-500/40"
                      : "bg-white/5 ring-white/10 hover:ring-white/20"
                  )}
                >
                  🌍 All Countries
                </button>
                {allCountries.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCountry(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm ring-1 transition",
                      selectedCountry === c ? "bg-indigo-500/20 ring-indigo-500/40" : "bg-white/5 ring-white/10 hover:ring-white/20"
                    )}
                    title={c}
                  >
                    {flag(c)} {c}
                  </button>
                ))}
              </div>

              {/* Listings grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paginated.map((l, i) => (
                  <motion.div
                    key={`${l.storeName}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="group rounded-xl p-4 ring-1 ring-white/10 bg-gradient-to-b from-white/5 to-transparent hover:ring-white/20 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 opacity-80" />
                        <span className="font-medium">{l.storeName}</span>
                      </div>
                      <span className="text-sm text-white/70">{flag(l.country)} {l.country}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <a
                        href={l.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        title={`Buy from ${l.storeName}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Buy Now
                      </a>
                      <Link
                        to={l.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/60 hover:text-white/90 underline underline-offset-4"
                      >
                        Open link
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-xs text-white/60">
                <ShieldCheck className="w-4 h-4" />
                MetaBeys lists third‑party stores for convenience. Availability and pricing are subject to change on the retailer’s site.
              </p>
            </motion.div>
          </div>

          {/* SEO section footer */}
          <div className="mt-10 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-white/60 flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              <span>Found {product.listings.length} total listing{product.listings.length !== 1 && "s"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
