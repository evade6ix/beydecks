// File: src/pages/StoreDetail.tsx
import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Copy,
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
interface Combo { blade: string; assistBlade?: string; ratchet: string; bit: string }
interface Player { name: string; combos: Combo[] }
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
  (s || "").toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")
const formatDate = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
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
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const storeRes = await fetch(`${API}/stores/${id}`, { signal: ctrl.signal })
        if (!storeRes.ok) throw new Error(`Failed to load store ${id}`)
        const s: Store = await storeRes.json()
        if (ignore) return
        setStore(s)

        let evs: Event[] = []
        try {
          const byId = await fetch(`${API}/events?storeId=${encodeURIComponent(String(s.id))}`, { signal: ctrl.signal })
          if (byId.ok) evs = await byId.json()
          else {
            const all = await fetch(`${API}/events`, { signal: ctrl.signal })
            if (all.ok) evs = (await all.json()).filter((e: Event) => eventMatchesStore(e, s))
          }
        } catch {
          const all = await fetch(`${API}/events`, { signal: ctrl.signal })
          if (all.ok) evs = (await all.json()).filter((e: Event) => eventMatchesStore(e, s))
        }
        if (!ignore) setEvents(evs)
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load store")
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true; ctrl.abort() }
  }, [id])

  const now = Date.now()
  const { upcoming, past, totalEvents, topPlayers, uniqueTopCutCount } = useMemo(() => {
    const matches = (e: Event) => (store ? eventMatchesStore(e, store) : false)
    const filtered = events.filter(matches)

    const upcoming = filtered
      .filter(e => +new Date(e.startTime) >= now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
    const past = filtered
      .filter(e => +new Date(e.startTime) < now)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))

    const playerCount = new Map<string, number>()
    const uniqueSet = new Set<string>()
    for (const ev of filtered) for (const p of ev.topCut || []) {
      const key = (p.name || "").trim()
      if (!key) continue
      uniqueSet.add(key)
      playerCount.set(key, (playerCount.get(key) || 0) + 1)
    }
    const topPlayers = [...playerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    return { upcoming, past, totalEvents: filtered.length, topPlayers, uniqueTopCutCount: uniqueSet.size }
  }, [events, store, now])

  function eventMatchesStore(e: Event, s: Store) {
    if (e.storeId != null && String(e.storeId) === String(s.id)) return true
    if (e.store && s.name) {
      const a = normalize(String(e.store)), b = normalize(s.name)
      if (a === b || a.includes(b) || b.includes(a)) return true
    }
    return false
  }

  function toast(msg: string) {
    const t = document.createElement("div")
    t.textContent = msg
    t.className = "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-base-200 text-base-content px-3 py-1.5 rounded shadow"
    document.body.appendChild(t); setTimeout(() => t.remove(), 1100)
  }
  function copy(text: string) { navigator.clipboard.writeText(text).then(() => toast("Copied")) }
  function copyLink() { copy(window.location.href) }
  function copyAddress() { if (store?.location) copy(`${store.name}\n${store.location}`) }
  function openDirections() {
    if (!store?.location) return
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.location)}`, "_blank")
  }
  function scrollPast(dir: "left" | "right") {
    const el = pastScrollRef.current; if (!el) return
    el.scrollBy({ left: (dir === "left" ? -1 : 1) * Math.round(el.clientWidth * 0.9), behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-28 rounded-3xl bg-base-200" />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-28 rounded-2xl bg-base-200" />
            <div className="h-28 rounded-2xl bg-base-200" />
            <div className="h-28 rounded-2xl bg-base-200" />
          </div>
          <div className="h-96 rounded-3xl bg-base-200" />
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
        <meta name="description" content={`View ${store.name} at ${store.location}. Upcoming events, past tournaments, top players, and map.`} />
        <meta property="og:title" content={`${store.name} — Store Profile`} />
        <meta property="og:description" content={`Events, location, and stats for ${store.name}.`} />
        <meta property="og:image" content={store.logo} />
        <meta property="og:url" content={canonical} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({ "@context": "https://schema.org", "@type": "SportsActivityLocation", name: store.name, image: store.logo, address: store.location, url: canonical })}
        </script>
      </Helmet>

      {/* BG glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_480px_at_0%_-10%,rgba(99,102,241,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_480px_at_100%_10%,rgba(16,185,129,0.12),transparent)]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 py-8">
        <div className="grid lg:grid-cols-[340px,1fr] gap-6 items-start">
          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-20">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white/[0.04] border border-white/10 shadow-xl overflow-hidden">
              <div className="p-6 relative">
                <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl" />
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden">
                    {store.logo ? <img src={store.logo} alt={store.name} className="h-14 w-14 object-contain" loading="lazy" /> : <span className="text-white/30 text-xs">No logo</span>}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold leading-tight">{store.name}</h1>
                    <div className="mt-1 text-white/70 text-sm flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" /><span>{store.location}</span>
                    </div>
                  </div>
                </div>

                {store.notes && <p className="mt-4 text-sm text-white/70 leading-relaxed">{store.notes}</p>}

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button onClick={copyLink} className="btn btn-sm btn-ghost"><Share2 className="w-4 h-4 mr-1" /> Share</button>
                  <button onClick={copyAddress} className="btn btn-sm btn-ghost"><Copy className="w-4 h-4 mr-1" /> Copy addr</button>
                  {store.website ? (
                    <a href={store.website} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost"><ExternalLink className="w-4 h-4 mr-1" /> Website</a>
                  ) : <span className="btn btn-sm btn-disabled">Website</span>}
                  <button onClick={openDirections} className="btn btn-sm btn-primary"><MapPin className="w-4 h-4 mr-1" /> Directions</button>
                </div>
              </div>

              {/* quick stats ribbon */}
              <div className="grid grid-cols-3 divide-x divide-white/10 bg-white/[0.03] border-t border-white/10">
                <StatTile label="Events" value={totalEvents} />
                <StatTile label="Upcoming" value={upcoming.length} />
                <StatTile label="Top-cut players" value={uniqueTopCutCount} />
              </div>

              {/* Top players list */}
              <div className="p-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Top 3 Players</h3>
                  <Trophy className="h-5 w-5 opacity-70" />
                </div>
                {topPlayers.length ? (
                  <ol className="mt-3 space-y-2">
                    {topPlayers.map((p, i) => (
                      <li key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg:white/10 bg-white/10 border border-white/15 grid place-items-center text-sm font-semibold">{i + 1}</div>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-white/60">{p.count} top cut</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-white/60 mt-3">No player stats yet.</p>
                )}
              </div>
            </motion.div>
          </aside>

          {/* MAIN */}
          <div className="min-w-0">
            {/* Overview */}
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white/[0.04] border border-white/10 shadow-xl p-6">
              <h2 className="text-xl font-bold">Overview</h2>
              <p className="mt-2 text-white/70 text-sm">
                Browse upcoming events, review recent tournaments, and get directions — all in one place for <span className="text-white">{store.name}</span>.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard title="Total Events Hosted" value={totalEvents} icon={<Calendar className="h-5 w-5" />} />
                <StatCard title="Upcoming Events" value={upcoming.length} icon={<ArrowRight className="h-5 w-5" />} />
                <StatCard title="Top-cut Players" value={uniqueTopCutCount} icon={<Trophy className="h-5 w-5" />} />
              </div>
            </motion.section>

            {/* Upcoming (timeline, no purple dot) */}
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Upcoming Events</h2>
                <Link to={`/stores/${store.id}/upcoming`} className="btn btn-ghost btn-sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {upcoming.length ? (
                <ul className="relative pl-6 before:content-[''] before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-white/10">
                  <AnimatePresence>
                    {upcoming.slice(0, 8).map((e, i) => (
                      <motion.li key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.03 }} className="relative mb-4">
                        {/* removed the colored dot */}
                        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 hover:bg-white/[0.06] transition">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(e.startTime)}</span>
                          </div>
                          <div className="mt-1 font-semibold">{e.title}</div>
                          <div className="mt-3 flex items-center justify-between">
                            <Link to={`/events/${e.id}`} className="btn btn-primary btn-sm">Details</Link>
                            {typeof e.attendeeCount === "number" && (
                              <span className="badge badge-outline">
                                <Users className="h-3.5 w-3.5 mr-1" /> {e.attendeeCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/60">No upcoming events. Check back soon!</div>
              )}
            </section>

            {/* Past (no forced image area) */}
            <section className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recent Tournaments</h2>
                <div className="flex gap-2">
                  <button onClick={() => scrollPast("left")} className="btn btn-sm" aria-label="Scroll left"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => scrollPast("right")} className="btn btn-sm" aria-label="Scroll right"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              {past.length ? (
                <div ref={pastScrollRef} className="no-scrollbar overflow-x-auto snap-x snap-mandatory">
                  <div className="flex gap-4 pr-2">
                    {past.slice(0, 20).map((e, i) => (
                      <Link key={e.id} to={`/events/${e.id}`} className="min-w-[300px] max-w-[300px] snap-start">
                        <motion.div
                          whileHover={{ y: -2 }}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.02 }}
                          className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden hover:shadow-lg"
                        >
                          {e.imageUrl && (
                            <div className="h-32 w-full overflow-hidden bg-white/5">
                              <img src={e.imageUrl} alt={e.title} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="text-xs text-white/60">{formatDate(e.startTime)}</div>
                            <div className="font-medium mt-1 line-clamp-2">{e.title}</div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="badge badge-ghost">Completed</span>
                              {typeof e.attendeeCount === "number" && (
                                <span className="badge badge-outline">
                                  <Users className="h-3.5 w-3.5 mr-1" /> {e.attendeeCount}
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
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/60">No completed tournaments yet.</div>
              )}
            </section>

            {/* Map */}
            <section className="mt-8">
              <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.04] shadow-xl relative">
                <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                {store.mapEmbedUrl ? (
                  <div className="w-full h-[460px] [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:block [&_iframe]:border-0" dangerouslySetInnerHTML={{ __html: store.mapEmbedUrl }} />
                ) : (
                  <div className="w-full h-[460px] grid place-items-center text-white/60">Map unavailable</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  )
}
function StatCard({ title, value, icon }: { title: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="opacity-70">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  )
}
