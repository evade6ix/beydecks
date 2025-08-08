// File: src/pages/StoreDetail.tsx
import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"
import {
  MapPin,
  ExternalLink,
  Share2,
  ArrowRight,
  Calendar,
  Trophy,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Store {
  id: number | string
  name: string
  location: string
  logo: string
  mapEmbedUrl: string
  website?: string
  notes?: string
}

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
}

interface Player {
  name: string
  combos: Combo[]
}

interface Event {
  id: number | string
  title: string
  startTime: string
  endTime?: string
  imageUrl?: string
  store?: string | number
  storeId?: number | string
  topCut?: Player[]
  attendeeCount?: number
}

const normalize = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")

const formatDate = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function StoreDetail() {
  const { id } = useParams()
  const [store, setStore] = useState<Store | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pastScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ignore = false
    const ctrl = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        // 1) Store
        const storeRes = await fetch(`${API}/stores/${id}`, { signal: ctrl.signal })
        if (!storeRes.ok) throw new Error(`Failed to load store ${id}`)
        const s: Store = await storeRes.json()
        if (ignore) return
        setStore(s)

        // 2) Events (robust: try storeId route first; fallback to all + local filter)
        let evs: Event[] = []
        try {
          const byId = await fetch(`${API}/events?storeId=${encodeURIComponent(String(s.id))}`, {
            signal: ctrl.signal,
          })
          if (byId.ok) {
            evs = await byId.json()
          } else {
            // Fallback: pull all and filter client-side
            const all = await fetch(`${API}/events`, { signal: ctrl.signal })
            if (all.ok) {
              const list: Event[] = await all.json()
              evs = list.filter((e) => eventMatchesStore(e, s))
            }
          }
        } catch {
          // Final fallback: pull all and filter client-side
          const all = await fetch(`${API}/events`, { signal: ctrl.signal })
          if (all.ok) {
            const list: Event[] = await all.json()
            evs = list.filter((e) => eventMatchesStore(e, s))
          }
        }

        if (!ignore) setEvents(evs)
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load store")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()

    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [id])

  const now = Date.now()

  const { upcoming, past, totalEvents, topPlayers } = useMemo(() => {
    const matches = (e: Event) => (store ? eventMatchesStore(e, store) : false)
    const filtered = events.filter(matches)

    const upcoming = filtered
      .filter((e) => new Date(e.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const past = filtered
      .filter((e) => new Date(e.startTime).getTime() < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

    // Top players by Top Cut appearances across this store’s events
    const playerCount = new Map<string, number>()
    for (const ev of filtered) {
      for (const p of ev.topCut || []) {
        const key = p.name.trim()
        if (!key) continue
        playerCount.set(key, (playerCount.get(key) || 0) + 1)
      }
    }
    const topPlayers = [...playerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    return {
      upcoming,
      past,
      totalEvents: filtered.length,
      topPlayers,
    }
  }, [events, store, now])

  function eventMatchesStore(e: Event, s: Store) {
    if (e.storeId != null && String(e.storeId) === String(s.id)) return true
    if (e.store && s.name) {
      const a = normalize(String(e.store))
      const b = normalize(s.name)
      if (a === b || a.includes(b) || b.includes(a)) return true
    }
    return false
  }

  function copyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      // naive toast without extra libs
      const t = document.createElement("div")
      t.textContent = "Link copied"
      t.className =
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-base-200 text-base-content px-3 py-1.5 rounded shadow"
      document.body.appendChild(t)
      setTimeout(() => t.remove(), 1200)
    })
  }

  function openDirections() {
    if (!store?.location) return
    const q = encodeURIComponent(store.location)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank")
  }

  function scrollPast(dir: "left" | "right") {
    const el = pastScrollRef.current
    if (!el) return
    const amount = Math.round(el.clientWidth * 0.9)
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-28 rounded-2xl bg-base-200" />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-28 rounded-xl bg-base-200" />
            <div className="h-28 rounded-xl bg-base-200" />
            <div className="h-28 rounded-xl bg-base-200" />
          </div>
          <div className="h-96 rounded-2xl bg-base-200" />
        </div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-error font-medium mb-2">Couldn’t load this store.</p>
        <p className="opacity-70">{error ?? "Unknown error"}</p>
      </div>
    )
  }

  const canonical = `https://www.metabeys.com/stores/${store.id}`

  return (
    <>
      <Helmet>
        <title>{store.name} — Store Details | MetaBeys</title>
        <meta
          name="description"
          content={`View ${store.name} in ${store.location}. Upcoming Beyblade events, past tournaments, top players, and map.`}
        />
        <meta property="og:title" content={`${store.name} — Store Profile`} />
        <meta property="og:description" content={`Events, location, and stats for ${store.name}.`} />
        <meta property="og:image" content={store.logo} />
        <meta property="og:url" content={canonical} />
        <link rel="canonical" href={canonical} />
        {/* Minimal JSON-LD for local business */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            name: store.name,
            image: store.logo,
            address: store.location,
            url: canonical,
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <div className="rounded-2xl bg-base-100/70 backdrop-blur shadow-lg border border-base-200 p-6 md:p-8">
            <div className="flex items-start gap-5 flex-wrap">
              {store.logo && (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-contain bg-base-200 p-2 shadow"
                />
              )}

              <div className="flex-1 min-w-[260px]">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{store.name}</h1>
                <div className="mt-2 flex items-center gap-3 text-sm text-neutral-content">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 opacity-80" />
                    <span>{store.location}</span>
                  </span>

                  {store.website && (
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 link link-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit website
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button onClick={copyLink} className="btn btn-sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </button>
                <button onClick={openDirections} className="btn btn-primary btn-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  Directions
                </button>
              </div>
            </div>

            {store.notes && (
              <p className="mt-4 text-sm md:text-base text-neutral-content leading-relaxed">
                {store.notes}
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Events Hosted"
            value={totalEvents}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Upcoming Events"
            value={upcoming.length}
            icon={<ArrowRight className="h-5 w-5" />}
          />
          <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Top 3 Players</h3>
              <Trophy className="h-5 w-5 opacity-70" />
            </div>
            {topPlayers.length ? (
              <ol className="mt-3 space-y-2">
                {topPlayers.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-base-200 grid place-items-center font-semibold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-neutral-content">
                          {p.count} top cut appearance{p.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-neutral-content mt-3">No player stats yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Upcoming Events</h2>
          <Link to={`/stores/${store.id}/upcoming`} className="btn btn-ghost btn-sm">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {upcoming.length ? (
          <div className="grid md:grid-cols-3 gap-4">
            {upcoming.slice(0, 3).map((e) => (
              <motion.div
                key={e.id}
                className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow"
                whileHover={{ y: -2 }}
              >
                <div className="card-body">
                  <div className="flex items-center gap-2 text-sm text-neutral-content">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(e.startTime)}</span>
                  </div>
                  <h3 className="card-title text-base mt-1">{e.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <Link to={`/events/${e.id}`} className="btn btn-primary btn-sm">
                      Details
                    </Link>
                    {typeof e.attendeeCount === "number" && (
                      <span className="badge badge-outline">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {e.attendeeCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-neutral-content">
            No upcoming events. Check back soon!
          </div>
        )}
      </section>

      {/* Past Tournaments – Horizontal Slider */}
      <section className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recent Tournaments</h2>
          <div className="flex gap-2">
            <button onClick={() => scrollPast("left")} className="btn btn-sm" aria-label="Scroll left">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => scrollPast("right")} className="btn btn-sm" aria-label="Scroll right">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {past.length ? (
          <div
            ref={pastScrollRef}
            className="no-scrollbar overflow-x-auto snap-x snap-mandatory"
          >
            <div className="flex gap-4 pr-2">
              {past.slice(0, 16).map((e) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  className="min-w-[260px] max-w-[260px] snap-start"
                >
                  <motion.div
                    className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow"
                    whileHover={{ y: -2 }}
                  >
                    {e.imageUrl && (
                      <div className="h-28 w-full overflow-hidden rounded-t-xl bg-base-200">
                        <img
                          src={e.imageUrl}
                          alt={e.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="card-body p-4">
                      <div className="text-xs text-neutral-content">{formatDate(e.startTime)}</div>
                      <div className="font-medium line-clamp-2 mt-1">{e.title}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="badge badge-ghost">Past</span>
                        {typeof e.attendeeCount === "number" && (
                          <span className="badge badge-outline">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {e.attendeeCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-neutral-content">
            No completed tournaments yet.
          </div>
        )}
      </section>

      {/* Map */}
<section className="p-6 md:p-10 max-w-6xl mx-auto">
  <div className="rounded-2xl overflow-hidden border border-base-200 bg-base-100 shadow">
    {store.mapEmbedUrl ? (
      <div
        className="w-full h-[420px]
                   [&_iframe]:w-full [&_iframe]:h-full
                   [&_iframe]:block [&_iframe]:border-0"
        dangerouslySetInnerHTML={{ __html: store.mapEmbedUrl }}
      />
    ) : (
      <div className="w-full h-[420px] grid place-items-center text-neutral-content">
        Map unavailable
      </div>
    )}
  </div>
</section>

    </>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number | string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="opacity-70">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  )
}
