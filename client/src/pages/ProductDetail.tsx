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
  Search,
  X,
} from "lucide-react"

/**
 * MetaBeys — ProductDetail (Insane Edition)
 * Super‑polished PDP with:
 *  - Hero banner + glass cards + glow
 *  - Sticky action bar with title + quick CTA
 *  - Country chips + store search + grouped sections
 *  - "Show more" for long descriptions and long offer lists
 *  - Keyboard shortcuts (/? help, / to focus search, g to jump to stores, Esc to close modals)
 *  - Image lightbox modal
 *  - Strong SEO (OG + Twitter + JSON‑LD)
 *
 * Zero breaking changes to data shape or routes.
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
const countryRank = (c: string) => {
  const k = c.toLowerCase()
  if (k.includes("canada")) return 0
  if (k.includes("united states") || k.includes("usa")) return 1
  if (k.includes("united kingdom") || k.includes("uk")) return 2
  if (k.includes("japan")) return 3
  return 9
}
const truncateAtWord = (str: string, max: number) => {
  if (!str) return ""
  if (str.length <= max) return str
  const slice = str.slice(0, max)
  const i = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf(""))
  return (i > 0 ? slice.slice(0, i) : slice).trim()
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [selectedCountry, setSelectedCountry] = useState<string>(() => localStorage.getItem("mb.country") || "All")
  const [storeQuery, setStoreQuery] = useState("")
  const [offersToShow, setOffersToShow] = useState(10)
  const [copied, setCopied] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const topRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const storesAnchorRef = useRef<HTMLDivElement>(null)

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
    return uniq.sort((a, b) => countryRank(a) - countryRank(b) || a.localeCompare(b))
  }, [product])

  const listingsFiltered = useMemo(() => {
    if (!product) return [] as Listing[]
    let base = product.listings
    if (selectedCountry !== "All") base = base.filter((l) => l.country === selectedCountry)
    if (storeQuery.trim()) base = base.filter((l) => l.storeName.toLowerCase().includes(storeQuery.toLowerCase()))
    return [...base].sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""))
  }, [product, selectedCountry, storeQuery])

  const groupedByCountry = useMemo(() => {
    const map = new Map<string, Listing[]>()
    for (const l of listingsFiltered.slice(0, offersToShow)) {
      const key = l.country || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return Array.from(map.entries()).sort((a, b) => countryRank(a[0]) - countryRank(b[0]) || a[0].localeCompare(b[0]))
  }, [listingsFiltered, offersToShow])

  const totalOffers = product?.listings?.length || 0
  const hasMoreOffers = listingsFiltered.length > offersToShow

  // Persist preferred country
  useEffect(() => {
    localStorage.setItem("mb.country", selectedCountry)
  }, [selectedCountry])

  // Sticky action reveal
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 220)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (key === 'g') {
        e.preventDefault()
        storesAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      if (key === '?') {
        e.preventDefault()
        setShowHelp((s) => !s)
      }
      if (key === 'escape') {
        setShowHelp(false)
        setShowImage(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse grid grid-cols-1 gap-8">
          <div className="aspect-[16/10] rounded-2xl bg-white/5 ring-1 ring-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/5 ring-1 ring-white/10" />
            ))}
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

  // Description truncation
  const MAX_DESC = 260
  const isLongDesc = (product.description || '').length > MAX_DESC
  const [descExpanded, setDescExpanded] = useState(false)
  const descToShow = isLongDesc && !descExpanded
    ? truncateAtWord(product.description, MAX_DESC) + '…'
    : product.description

  // CTA: first visible offer (respect filters if any, else first overall)
  const firstOffer = listingsFiltered[0] || product.listings[0]

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
        <meta name="twitter:card" content="summary_large_image" />
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
                {firstOffer ? (
                  <a className="btn btn-primary btn-sm" href={firstOffer.buyLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2"/> Buy Now
                  </a>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-600/25 via-fuchsia-500/10 to-transparent blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6" ref={topRef}>
          {/* Top controls */}
          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/15 hover:ring-white/30 transition"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </button>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <button className="underline underline-offset-4 hover:text-white" onClick={() => setShowHelp(true)}>Keyboard ?</button>
            </div>
          </div>

          {/* HERO */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Visual */}
              <div className="lg:col-span-7 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-fuchsia-500/10" />
                <div className="aspect-[16/10] lg:aspect-[4/3] flex items-center justify-center bg-black/30">
                  <img
                    src={imageUrl}
                    alt={product.title}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain select-none cursor-zoom-in"
                    onClick={() => setShowImage(true)}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col gap-4">
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

                <div className="text-sm md:text-base leading-relaxed text-white/80 whitespace-pre-line">
                  {descToShow}
                  {isLongDesc && (
                    <button
                      className="ml-2 text-indigo-300 hover:text-indigo-200 underline underline-offset-4"
                      onClick={() => setDescExpanded((s) => !s)}
                    >
                      {descExpanded ? "View less" : "View more"}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button className="btn btn-ghost btn-sm" onClick={onShare}>
                    <Share2 className="w-4 h-4 mr-2"/> Share
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={onCopyLink}>
                    {copied ? <Check className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>} Copy Link
                  </button>
                  {firstOffer ? (
                    <a className="btn btn-primary btn-sm" href={firstOffer.buyLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2"/> Quick Buy
                    </a>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-white/60 flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  <span>{totalOffers} total listing{totalOffers !== 1 && 's'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STORES */}
          <div ref={storesAnchorRef} className="mt-8" />
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">Where to Buy</h2>
            <div className="text-sm text-white/70">{listingsFiltered.length} result{listingsFiltered.length !== 1 && 's'}</div>
          </div>

          {/* Filters */}
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

            <div className="relative ml-auto w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/60" />
              <input
                ref={searchRef}
                value={storeQuery}
                onChange={(e) => setStoreQuery(e.target.value)}
                placeholder="Search stores ( / )"
                className="input input-sm w-full pl-9"
              />
              {storeQuery && (
                <button className="absolute right-2 top-1.5 p-1 rounded hover:bg-white/10" onClick={() => setStoreQuery("")}> 
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped offers */}
          <div className="mt-4 space-y-6">
            {groupedByCountry.length === 0 && (
              <div className="rounded-xl border border-white/10 p-6 text-center text-white/70">
                No stores match your filters. Try switching country or clearing the search.
              </div>
            )}

            {groupedByCountry.map(([country, list]) => (
              <div key={country}>
                <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                  <MapPin className="w-4 h-4" />{flag(country)} {country}
                  <span className="text-white/50 font-normal">• {list.length} store{list.length!==1 && 's'}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

          {hasMoreOffers && (
            <div className="mt-6 flex justify-center">
              <button className="btn btn-outline" onClick={() => setOffersToShow((n) => n + 10)}>
                Show more offers
              </button>
            </div>
          )}

          <p className="mt-8 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="w-4 h-4" /> MetaBeys lists third‑party stores for convenience. Availability and pricing are subject to change on the retailer’s site.
          </p>

          <div className="h-12" />
        </div>
      </section>

      {/* Image lightbox */}
      <AnimatePresence>
        {showImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4"
            onClick={() => setShowImage(false)}
          >
            <img src={imageUrl} alt={product.title} className="max-h-[90vh] max-w-[90vw] object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard help modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur"
            onClick={() => setShowHelp(false)}
          >
            <div className="h-full w-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-md w-full rounded-2xl bg-white/5 ring-1 ring-white/10 p-6"
              >
                <h3 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h3>
                <ul className="text-sm space-y-2 text-white/80">
                  <li><kbd className="px-1.5 py-0.5 rounded bg-white/10">/</kbd> Focus store search</li>
                  <li><kbd className="px-1.5 py-0.5 rounded bg-white/10">g</kbd> Jump to stores</li>
                  <li><kbd className="px-1.5 py-0.5 rounded bg-white/10">Esc</kbd> Close dialogs</li>
                  <li><kbd className="px-1.5 py-0.5 rounded bg-white/10">?</kbd> Toggle this help</li>
                </ul>
                <div className="mt-4 text-right">
                  <button className="btn btn-sm" onClick={() => setShowHelp(false)}>Close</button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
