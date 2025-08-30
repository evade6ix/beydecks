import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  ExternalLink,
  Store as StoreIcon,
  Globe2,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  MapPin,
} from "lucide-react"

/**
 * MetaBeys — ProductDetail (Ultimate Edition)
 * - No breaking changes to data shape or routes
 * - Adds sticky action bar, grouped store lists, buttery animations, keyboard nav, and micro‑interactions
 * - Polished SEO (canonical, OG, JSON‑LD)
 * - All Tailwind/DaisyUI + framer‑motion + lucide
 */

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
  const perPage = 10

  const topRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  // Fetch
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

  // Derived
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
    return [...base].sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""))
  }, [product, selectedCountry])

  const groupedByCountry = useMemo(() => {
    const map = new Map<string, Listing[]>()
    for (const l of listingsFiltered) {
      const key = l.country || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [listingsFiltered])

  const totalPages = Math.ceil(listingsFiltered.length / perPage) || 1

  useEffect(() => {
    setPage(1)
  }, [selectedCountry])

  // Sticky header reveal
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setShowSticky(y > 220)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Keyboard navigation (j/k and arrows)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") setPage((p) => Math.min(totalPages, p + 1))
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "k") setPage((p) => Math.max(1, p - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [totalPages])

  // Scroll to top on page/filter change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [page, selectedCountry])

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
        await navigator.share({ title: product.title, text: product.description, url: window.location.href })
      } catch {
        /* cancelled */
      }
    } else {
      onCopyLink()
    }
  }

  // --- states ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 aspect-square rounded-2xl bg-white/5 ring-1 ring-white/10" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-10 w-3/4 rounded-lg bg-white/5" />
            <div className="h-5 w-1/2 rounded bg-white/5" />
            <div className="h-28 w-full rounded-xl bg-white/5" />
            <div className="h-10 w-40 rounded-lg bg.white/5" />
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

      {/* Sticky action bar */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/70 border-b border-white/10"
            ref={stickyRef}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <span className="font-semibold truncate max-w-[46vw]">{product.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm" onClick={onShare}><Share2 className="w-4 h-4 mr-2"/>Share</button>
                <button className="btn btn-primary btn-sm" onClick={() => topRef.current?.scrollIntoView({behavior:'smooth'})}>
                  View {listingsFiltered.length} Offer{listingsFiltered.length!==1 && 's'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-600/20 via-fuchsia-500/10 to-transparent blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6" ref={topRef}>
          {/* Top nav */}
          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/15 hover:ring-white/30 transition"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </button>
            <div className="text-xs text-white/60">Tip: use <kbd className="px-1.5 py-0.5 rounded bg-white/10">J</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-white/10">K</kbd> to flip pages</div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
            {/* Left: Gallery & Details */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-6 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-6 backdrop-blur-sm"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-black/20 flex items-center justify-center">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={imageUrl}
                  alt={product.title}
                  loading="lazy"
                  className="h-full w-full object-contain transition-transform duration-300 hover:scale-[1.02]"
                  draggable={false}
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">{product.title}</h1>
                  {(product.brand || product.productType) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {product.brand && (
                        <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Brand: {product.brand}</span>
                      )}
                      {product.productType && (
                        <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Type: {product.productType}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={onShare}><Share2 className="w-4 h-4 mr-2"/>Share</button>
                  <button className="btn btn-ghost btn-sm" onClick={onCopyLink}>{copied ? <Check className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>}Copy</button>
                </div>
              </div>

              <p className="mt-3 text-sm md:text-base leading-relaxed text-white/80 whitespace-pre-line">{product.description}</p>
            </motion.div>

            {/* Right: Offers / Filters */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="lg:col-span-6 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold">Available Stores</h2>
                <div className="text-sm text-white/70">{listingsFiltered.length} result{listingsFiltered.length !== 1 && "s"}</div>
              </div>

              {/* Filter row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedCountry("All")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm ring-1 transition",
                    selectedCountry === "All" ? "bg-indigo-500/20 ring-indigo-500/40" : "bg-white/5 ring-white/10 hover:ring-white/20"
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

              {/* Grouped listings (country headings) */}
              <div className="mt-4 space-y-6">
                {groupedByCountry.map(([country, list]) => (
                  <div key={country}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                      <MapPin className="w-4 h-4" />{flag(country)} {country}
                      <span className="text-white/50 font-normal">• {list.length} store{list.length!==1 && 's'}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AnimatePresence mode="popLayout">
                        {list.map((l, i) => (
                          <motion.div
                            key={`${country}-${l.storeName}-${i}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.22, delay: i * 0.02 }}
                            className="group rounded-xl p-4 ring-1 ring-white/10 bg-gradient-to-b from-white/5 to-transparent hover:ring-white/20 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <StoreIcon className="w-4 h-4 opacity-80" />
                                <span className="font-medium">{l.storeName}</span>
                              </div>
                              <span className="text-xs text-white/60">{flag(l.country)} {l.country}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <a href={l.buyLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm" title={`Buy from ${l.storeName}`}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Buy Now
                              </a>
                              <Link to={l.buyLink} target="_blank" rel="noopener noreferrer" className="text-xs text-white/60 hover:text-white/90 underline underline-offset-4">Open link</Link>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm">
                  <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-xs text-white/60">
                <ShieldCheck className="w-4 h-4" /> MetaBeys lists third‑party stores for convenience. Availability and pricing are subject to change on the retailer’s site.
              </p>
            </motion.div>
          </div>

          {/* Footer meta */}
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
