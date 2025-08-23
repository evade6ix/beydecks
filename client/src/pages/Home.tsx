// File: src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  MapPin,
  CalendarCheck,
  List,
  BarChart3,
  Flame,
  ShoppingBag,
  Clock,
  Star,
  ChevronRight,
  Filter,
  FlaskConical,
  Users,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* --------------------------------
   Types
---------------------------------*/
type Player = {
  name: string
  combos?: { blade: string; assistBlade?: string; ratchet: string; bit: string }[]
}

type EventItem = {
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  topCut?: Player[]
  attendeeCount?: number
  participants?: number | any[]
  playerCount?: number
  players?: number | any[]
  attendees?: number | any[]
  attendance?: number
  participantIds?: any[]
  attendeeIds?: any[]
  participantList?: string
}

type ProductItem = { id: number | string; title: string; imageUrl?: string }
type TimeRange = "all" | "24h" | "7d" | "30d" | "month" | "90d" | "year" | "lastYear"

type LeaderboardUser = {
  slug: string
  username?: string
  displayName?: string
  avatarDataUrl?: string
  firsts?: number
  seconds?: number
  thirds?: number
  topCutCount?: number
  tournamentsCount?: number
  tournamentsPlayed?: Array<{ placement?: string }>
}

type LeaderboardUserD = LeaderboardUser & {
  _firsts: number
  _seconds: number
  _thirds: number
  _topcutsOnly: number
  _total: number
}

function deriveUser(u: LeaderboardUser): LeaderboardUserD {
  const tp = Array.isArray(u.tournamentsPlayed) ? u.tournamentsPlayed : []
  let f = 0, s = 0, t = 0, tcOnly = 0

  if (tp.length) {
    for (const e of tp) {
      const plc = e?.placement
      if (plc === "First Place") f++
      else if (plc === "Second Place") s++
      else if (plc === "Third Place") t++
      else if (plc === "Top Cut") tcOnly++
    }
  } else {
    f = Number(u.firsts || 0)
    s = Number(u.seconds || 0)
    t = Number(u.thirds || 0)
    const raw = Number(u.topCutCount || 0)
    tcOnly = Math.max(0, raw - (f + s + t))
  }

  return {
    ...u,
    _firsts: f,
    _seconds: s,
    _thirds: t,
    _topcutsOnly: tcOnly,
    _total: f + s + t + tcOnly,
  }
}

function normalizeLB(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.users)) return payload.users
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.leaderboard)) return payload.leaderboard
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.list)) return payload.list
  // Some APIs respond { ok:true, data:{ items:[...] } }
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}

function coerceUser(u: any): LeaderboardUser | null {
  const slug =
    u?.slug ?? u?.userSlug ?? u?.username ?? u?.handle ?? u?.user?.slug ?? u?.user?.username ?? u?.id
  if (!slug) return null

  return {
    slug: String(slug),
    username: u?.username ?? u?.handle ?? u?.user?.username ?? u?.name ?? u?.displayName,
    displayName: u?.displayName ?? u?.name ?? u?.user?.displayName ?? u?.username ?? u?.handle,
    avatarDataUrl: u?.avatarDataUrl ?? u?.avatarUrl ?? u?.avatar ?? u?.user?.avatarUrl,
    firsts: u?.firsts ?? u?.gold ?? u?.wins ?? 0,
    seconds: u?.seconds ?? u?.silver ?? 0,
    thirds: u?.thirds ?? u?.bronze ?? 0,
    topCutCount: u?.topCutCount ?? u?.topCuts ?? u?.tc ?? 0,
    tournamentsCount: u?.tournamentsCount ?? u?.events ?? u?.results ?? u?.total ?? u?.count ?? 0,
    tournamentsPlayed: u?.tournamentsPlayed ?? u?.resultsList ?? u?.entries ?? undefined,
  }
}


async function fetchLeadersEverywhere(limit = 12): Promise<LeaderboardUser[]> {
  const base = import.meta.env.VITE_API_URL || ""
  const qs = (q = "") => (q ? `&${q}` : "")
  const tries = [
    // Common patterns used across the app / API
    `/api/users/leaderboard?limit=${limit}${qs("sort=total")}`,
    `/api/leaderboard/users?limit=${limit}${qs("sort=total")}`,
    `/api/leaderboard?limit=${limit}${qs("sort=total")}`,
    `/users/leaderboard?limit=${limit}${qs("sort=total")}`,
    `/players/leaderboard?limit=${limit}${qs("sort=total")}`,

    // With base URL (prod/staging/local API host)
    `${base}/api/users/leaderboard?limit=${limit}${qs("sort=total")}`,
    `${base}/api/leaderboard/users?limit=${limit}${qs("sort=total")}`,
    `${base}/api/leaderboard?limit=${limit}${qs("sort=total")}`,
    `${base}/users/leaderboard?limit=${limit}${qs("sort=total")}`,
    `${base}/players/leaderboard?limit=${limit}${qs("sort=total")}`,

    // No sort param fallbacks
    `/api/users/leaderboard?limit=${limit}`,
    `/api/leaderboard/users?limit=${limit}`,
    `${base}/api/users/leaderboard?limit=${limit}`,
    `${base}/api/leaderboard/users?limit=${limit}`,
  ]

  for (const url of tries) {
    try {
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) continue
      const payload = await res.json().catch(() => null)
      const raw = normalizeLB(payload)
      const coerced = raw.map(coerceUser).filter(Boolean) as LeaderboardUser[]
      if (coerced.length) {
        if (import.meta.env.DEV) console.info("[Home] Leaderboard via", url, "→", coerced.length, "rows")
        return coerced
      }
    } catch {
      // try next
    }
  }
  if (import.meta.env.DEV) console.warn("[Home] Leaderboard: all endpoints returned empty/failed.")
  return []
}


/* --------------------------------
   Small utils
---------------------------------*/
const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ")

const useCountdown = (date?: string | null) => {
  const [now, setNow] = useState(() => new Date().getTime())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!date) return { d: 0, h: 0, m: 0, s: 0, done: true }
  const diff = Math.max(0, new Date(date).getTime() - now)
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / (1000 * 60)) % 60)
  const s = Math.floor((diff / 1000) % 60)
  return { d, h, m, s, done: diff === 0 }
}

type PopularityRow = { name: string; count: number; pct: number }

function cutoffFor(range: TimeRange) {
  const now = new Date()
  switch (range) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1)
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case "year": return new Date(now.getFullYear(), 0, 1)
    case "lastYear": return new Date(now.getFullYear() - 1, 0, 1)
    default: return null
  }
}

/* --------------------------------
   Page
---------------------------------*/
export default function Home() {
  const [upcoming, setUpcoming] = useState<EventItem | null>(null)
  const [recent, setRecent] = useState<EventItem[]>([])
  const [completed, setCompleted] = useState<EventItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [stats, setStats] = useState({ totalUpcoming: 0, totalCompleted: 0, monthEvents: 0 })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("all")

  // NEW: leaderboard state
  const [leaders, setLeaders] = useState<LeaderboardUserD[]>([])  
  const [leadersLoading, setLeadersLoading] = useState(true)

  const navigate = useNavigate()

  // auth → username for greeting
  const { user } = (useAuth?.() as any) || {}
  const username =
    ((user?.username as string) ||
      (user?.email ? String(user.email).split("@")[0] : "")).toString().trim()

  // KPI “Top Blade”
  const [topBladeName, setTopBladeName] = useState<string>("—")

  // Tournament Lab local state
  const [tlBlade, setTlBlade] = useState<string>("")
  const [tlAssist, setTlAssist] = useState<string>("")
  const [tlRatchet, setTlRatchet] = useState<string>("")
  const [tlBit, setTlBit] = useState<string>("")

  // Part popularity (now includes assistBlades with separate denominator)
  const [popularity, setPopularity] = useState<{
    totalCombos: number
    totalAssistCombos: number
    blades: PopularityRow[]
    assistBlades: PopularityRow[]
    ratchets: PopularityRow[]
    bits: PopularityRow[]
  }>({ totalCombos: 0, totalAssistCombos: 0, blades: [], assistBlades: [], ratchets: [], bits: [] })

  // load once
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [eventsRes, productsRes] = await Promise.all([
          fetch(`${API}/events`),
          fetch(`${API}/products`),
        ])
        const [eventsData, productsData] = await Promise.all([
          eventsRes.json(),
          productsRes.json(),
        ])

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const events: EventItem[] = eventsData || []
        const futureEvents = events
          .filter(e => new Date(e.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        const completedEvents = events
          .filter(e => new Date(e.endTime) < now)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setUpcoming(futureEvents[0] || null)
        setRecent(completedEvents.slice(0, 5))
        setCompleted(completedEvents)
        setStats({
          totalUpcoming: futureEvents.length,
          totalCompleted: completedEvents.length,
          monthEvents: events.filter(e => new Date(e.startTime) >= startOfMonth).length,
        })

        // KPI: compute top blade name quickly
        const bladeMap: Record<string, number> = {}
        for (const event of completedEvents) {
          for (const player of event.topCut ?? []) {
            for (const combo of player.combos ?? []) {
              const b = (combo.blade || "").trim()
              if (!b) continue
              bladeMap[b] = (bladeMap[b] || 0) + 1
            }
          }
        }
        const top = Object.entries(bladeMap).sort((a, b) => b[1] - a[1])[0]
        setTopBladeName(top?.[0] ?? "—")

        setProducts((productsData as ProductItem[]).slice(0, 8))
      } catch (e: any) {
        console.warn("Home load failed", e)
      } finally {
        setLoading(false)
      }

      // NEW: fetch leaderboard (multi-URL + shape normalization)
try {
  setLeadersLoading(true)
const list = await fetchLeadersEverywhere(12)
const derived = list.map(deriveUser)

// sort by our computed total; tie-break by wins, then seconds, thirds, then slug for stability
derived.sort((a, b) =>
  (b._total - a._total) ||
  (b._firsts - a._firsts) ||
  (b._seconds - a._seconds) ||
  (b._thirds - a._thirds) ||
  a.slug.localeCompare(b.slug)
)

setLeaders(derived)

} catch (e) {
  console.warn("[Home] Leaderboard fetch failed", e)
  setLeaders([])
} finally {
  setLeadersLoading(false)
}

    }
    load()
  }, [])

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    []
  )

  const countdown = useCountdown(upcoming?.startTime || null)

  // filter events by selected timeRange
  const filteredEvents = useMemo(() => {
    if (!completed.length) return []
    const start = cutoffFor(timeRange)
    return start
      ? completed.filter(e => {
          const end = new Date(e.endTime)
          if (timeRange === "lastYear") {
            const ny = new Date(new Date().getFullYear(), 0, 1)
            return end >= start && end < ny
          }
          return end >= start
        })
      : completed
  }, [completed, timeRange])

  // compute popularity lists (Assist uses its own denominator)
  useEffect(() => {
    const maps = {
      blade: new Map<string, number>(),
      assistBlade: new Map<string, number>(),
      ratchet: new Map<string, number>(),
      bit: new Map<string, number>(),
    }
    let total = 0
    let assistTotal = 0

    for (const e of filteredEvents) {
      for (const p of e.topCut ?? []) {
        for (const c of p.combos ?? []) {
          total++
          if (c.blade) maps.blade.set(c.blade, (maps.blade.get(c.blade) || 0) + 1)
          if (c.assistBlade) {
            assistTotal++
            maps.assistBlade.set(c.assistBlade, (maps.assistBlade.get(c.assistBlade) || 0) + 1)
          }
          if (c.ratchet) maps.ratchet.set(c.ratchet, (maps.ratchet.get(c.ratchet) || 0) + 1)
          if (c.bit) maps.bit.set(c.bit, (maps.bit.get(c.bit) || 0) + 1)
        }
      }
    }

    const toArray = (m: Map<string, number>, denom: number): PopularityRow[] =>
      Array.from(m.entries())
        .map(([name, count]) => ({ name, count, pct: denom ? Math.round((count / denom) * 1000) / 10 : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

    setPopularity({
      totalCombos: total,
      totalAssistCombos: assistTotal,
      blades: toArray(maps.blade, total),
      assistBlades: toArray(maps.assistBlade, assistTotal),
      ratchets: toArray(maps.ratchet, total),
      bits: toArray(maps.bit, total),
    })
  }, [filteredEvents])

  // TL options & stats (include assist blades)
  const parts = useMemo(() => {
    const b = new Set<string>(), ab = new Set<string>(), r = new Set<string>(), bt = new Set<string>()
    for (const e of filteredEvents) {
      for (const p of e.topCut ?? []) {
        for (const c of p.combos ?? []) {
          if (c.blade) b.add(c.blade)
          if (c.assistBlade) ab.add(c.assistBlade)
          if (c.ratchet) r.add(c.ratchet)
          if (c.bit) bt.add(c.bit)
        }
      }
    }
    return {
      blades: Array.from(b).sort(),
      assistBlades: Array.from(ab).sort(),
      ratchets: Array.from(r).sort(),
      bits: Array.from(bt).sort(),
    }
  }, [filteredEvents])

  const tlStats = useMemo(() => {
    let total = 0
    let matches = 0
    const eventsMatched: { id: EventItem["id"]; title: string; date: string }[] = []

    for (const e of filteredEvents) {
      let eventMatched = false
      for (const p of e.topCut ?? []) {
        for (const c of p.combos ?? []) {
          total++
          const okBlade   = !tlBlade   || c.blade === tlBlade
          const okAssist  = !tlAssist  || c.assistBlade === tlAssist
          const okRatchet = !tlRatchet || c.ratchet === tlRatchet
          const okBit     = !tlBit     || c.bit === tlBit
          if (okBlade && okAssist && okRatchet && okBit) {
            matches++
            eventMatched = true
          }
        }
      }
      if (eventMatched) {
        eventsMatched.push({ id: e.id, title: e.title, date: fmt.format(new Date(e.endTime)) })
      }
    }

    const pct = total ? Math.round((matches / total) * 1000) / 10 : 0
    return { pct, matches, total, eventsMatched }
  }, [filteredEvents, tlBlade, tlAssist, tlRatchet, tlBit, fmt])

  // attendee count detection (prioritize attendeeCount)
  const getAttendeeCount = (e: EventItem): number | undefined => {
    const firstNum = (...vals: any[]) => vals.find(v => typeof v === "number" && v > 0) as number | undefined
    const numberCandidate = firstNum(
      (e as any).attendeeCount,
      e.participants as any,
      e.playerCount,
      e.attendees as any,
      e.attendance,
      typeof e.players === "number" ? e.players : undefined
    )
    if (numberCandidate) return numberCandidate
    if (Array.isArray(e.players)) return e.players.length
    if (Array.isArray(e.participants)) return e.participants.length
    if (Array.isArray(e.attendeeIds)) return e.attendeeIds.length
    if (Array.isArray(e.participantIds)) return e.participantIds.length
    if (typeof e.participantList === "string") {
      const count = e.participantList.split(",").map(s => s.trim()).filter(Boolean).length
      return count || undefined
    }
    return undefined
  }

  return (
    <>
      <Helmet>
        <title>MetaBeys — Competitive Beyblade X Dashboard</title>
        <meta name="description" content="Live insights, upcoming & recent events, and shop spotlight — all in one polished dashboard for Beyblade X." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MetaBeys — Competitive Beyblade X Dashboard" />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="https://www.metabeys.com/og.png" />
      </Helmet>

      {/* Canvas background */}
      <div className="relative min-h-[100dvh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(1200px_600px_at_20%_-10%,theme(colors.indigo.600/.25),transparent_60%),radial-gradient(800px_400px_at_100%_0%,theme(colors.fuchsia.600/.25),transparent_60%),radial-gradient(1000px_500px_at_50%_120%,theme(colors.sky.600/.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.07))]" />

        <motion.div
          className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {username
                  ? <>Welcome back <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400">{username}</span></>
                  : <>Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400">MetaBeys</span></>}
              </h1>
              <p className="mt-2 text-sm md:text-base text-white/60">Your home dashboard for events, meta trends, and player leaderboards.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/events" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10">
                <CalendarCheck className="h-4 w-4" /> Explore Events
              </Link>
              <Link to="/tournament-lab" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600/90 px-4 py-2 text-sm font-medium shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500">
                <BarChart3 className="h-4 w-4" /> Tournament Lab
              </Link>
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10">
                <ShoppingBag className="h-4 w-4" /> Shop
              </Link>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KPI label="Upcoming Events" value={stats.totalUpcoming} icon={<CalendarCheck className="h-4 w-4" />} hint="Across all stores" />
            <KPI label="Completed" value={stats.totalCompleted} icon={<List className="h-4 w-4" />} hint="Lifetime" />
            <KPI label="This Month" value={stats.monthEvents} icon={<Flame className="h-4 w-4" />} hint="Events Tracked This Month" />
            <KPI label="Top Blade" value={topBladeName} icon={<Trophy className="h-4 w-4" />} hint="By top cut" />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Next + Part Popularity + Tournament Lab */}
            <div className="space-y-6 lg:col-span-2">
              <Section title="Next Up" icon={<Clock className="h-5 w-5" />}>
                {loading ? (
                  <Skeleton height="h-28" />
                ) : upcoming ? (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold leading-tight">{upcoming.title}</h3>
                      <p className="text-white/60 mt-1">
                        {fmt.format(new Date(upcoming.startTime))} · <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{upcoming.store}</span>
                      </p>
                    </div>
                    <CountdownPill d={countdown.d} h={countdown.h} m={countdown.m} s={countdown.s} />
                  </div>
                ) : (
                  <p className="text-white/60">No upcoming events found.</p>
                )}
                <div className="mt-4">
                  <Link to={upcoming ? `/events/${upcoming.id}` : "/events"} className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                    View details <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </Section>

              {/* Part Popularity Leaderboard */}
              <Section title="Part Popularity" icon={<Flame className="h-5 w-5" />}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs text-white/60">
                    <Filter className="h-4 w-4" /> Time range
                  </div>
                  <Segmented
                    value={timeRange}
                    onChange={setTimeRange}
                    options={[
                      { label: "All", value: "all" },
                      { label: "7d", value: "7d" },
                      { label: "30d", value: "30d" },
                      { label: "This Month", value: "month" },
                      { label: "90d", value: "90d" },
                      { label: "This Year", value: "year" },
                    ]}
                  />
                </div>

                <div className="min-h-64 grid gap-3 md:grid-cols-2">
                  <div className="grid gap-3 [grid-auto-rows:1fr]">
                    <PopularityList title="Blades"        items={popularity.blades}        className="h-full" />
                    <PopularityList title="Assist Blades" items={popularity.assistBlades}  className="h-full" />
                  </div>
                  <div className="grid gap-3 [grid-auto-rows:1fr]">
                    <PopularityList title="Ratchets"      items={popularity.ratchets}      className="h-full" />
                    <PopularityList title="Bits"          items={popularity.bits}          className="h-full" />
                  </div>
                </div>

                <div className="mt-4 text-sm text-white/60 space-y-1">
                  <div>Based on {popularity.totalCombos || 0} top-cut combos in the selected range.</div>
                  <div className="text-white/50">Assist Blade % based on {popularity.totalAssistCombos || 0} combos that used an assist.</div>
                </div>
              </Section>

              {/* Tournament Lab */}
              <Section title="Tournament Lab" icon={<FlaskConical className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <ComboBox label="Blade"        value={tlBlade}   onChange={setTlBlade}   options={parts.blades}        placeholder="Any blade" />
                  <ComboBox label="Assist Blade" value={tlAssist}  onChange={setTlAssist}  options={parts.assistBlades}  placeholder="Any assist" />
                  <ComboBox label="Ratchet"      value={tlRatchet} onChange={setTlRatchet} options={parts.ratchets}      placeholder="Any ratchet" />
                  <ComboBox label="Bit"          value={tlBit}     onChange={setTlBit}     options={parts.bits}          placeholder="Any bit" />
                </div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/60">Appearance Rate</div>
                    <div className="mt-2 text-3xl font-semibold">{tlStats.pct}%</div>
                    <div className="mt-1 text-xs text-white/60 tabular-nums">
                      {tlStats.matches} matches / {tlStats.total} top-cut combos
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, tlStats.pct)}%`, background: "linear-gradient(180deg,#a78bfa,#22d3ee)" }} />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Link to="/tournament-lab" className="btn btn-sm rounded-xl bg-indigo-600/90 hover:bg-indigo-500 border-0 px-4">
                        Tournament Lab
                      </Link>
                      <button
                        onClick={() => { setTlBlade(""); setTlAssist(""); setTlRatchet(""); setTlBit(""); }}
                        className="btn btn-sm rounded-xl border-white/10 bg-white/5 hover:bg-white/10 px-4"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/60">Matching events</div>
                    {tlStats.eventsMatched.length ? (
                      <ul className="max-h-56 overflow-auto space-y-2 pr-1 isolate">
                        {tlStats.eventsMatched.map(ev => (
                          <li key={ev.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{ev.title}</div>
                              <div className="text-xs text-white/60">{ev.date}</div>
                            </div>
                            <Link to={`/events/${ev.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-white/60">No events matched that combo in this time range.</div>
                    )}
                  </div>
                </div>
              </Section>
            </div>

            {/* Right: Recent, Player Leaderboard, Shop */}
            <div className="space-y-6">
              <Section title="Recent Events" icon={<Trophy className="h-5 w-5" />}>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton height="h-16" /><Skeleton height="h-16" /><Skeleton height="h-16" />
                  </div>
                ) : recent.length ? (
                  <ul className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {recent.map(e => {
                        const attendees = getAttendeeCount(e)
                        return (
                          <motion.li
                            key={e.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="group isolate overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                          >
                            <Link to={`/events/${e.id}`} className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium leading-tight group-hover:text-white/95">{e.title}</div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                                  <span className="inline-flex items-center gap-1">
                                    {fmt.format(new Date(e.endTime))} · <MapPin className="h-3.5 w-3.5" /> {e.store}
                                  </span>
                                </div>
                                <TopCutRow players={e.topCut?.slice(0, 3)} />
                              </div>

                              <div className="flex items-center gap-2 pl-2">
                                {typeof attendees === "number" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80">
                                    <Users className="h-3.5 w-3.5" /> {attendees}
                                  </span>
                                )}
                                <ChevronRight className="h-4 w-4 mt-1 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            </Link>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <p className="text-white/60">No completed events yet.</p>
                )}
                <div className="mt-4">
                  <Link to="/events/completed" className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                    View all completed <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </Section>

              {/* NEW: Player Leaderboard snippet */}
              <Section title="Player Leaderboard" icon={<BarChart3 className="h-5 w-5" />}>
                {leadersLoading ? (
                  <div className="space-y-2">
                    <Skeleton height="h-14" /><Skeleton height="h-14" /><Skeleton height="h-14" />
                  </div>
                ) : leaders.length === 0 ? (
                  <div className="text-sm text-white/60">No player data yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {leaders.slice(0, 6).map((p, i) => (
                      <LeaderboardMiniRow key={p.slug || i} rank={i + 1} p={p} />
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Link to="/players" className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                    View full leaderboard <ChevronRight className="h-4 w-4" />
                  </Link>
                  <div className="text-xs text-white/50">Ranked by total results</div>
                </div>
              </Section>

              {/* Shop Spotlight (pushed down) */}
              <Section title="Shop Spotlight" icon={<ShoppingBag className="h-5 w-5" />}>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3"><Skeleton height="h-36" /><Skeleton height="h-36" /></div>
                ) : products.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                      {products.slice(0, 4).map(p => (
                        <motion.button
                          key={p.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => navigate(`/product/${p.id}`)}
                          className="group isolate overflow-hidden relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-3 text-left transition hover:from-white/15"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/20">
                            <img src={p.imageUrl || "/placeholder.svg"} alt={p.title} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                          </div>
                          <div className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{p.title}</div>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-white/60">No products available.</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                    Browse all products <ChevronRight className="h-4 w-4" />
                  </Link>
                  <div className="inline-flex items-center gap-1 text-xs text-white/50">
                    <Star className="h-3.5 w-3.5" /> Community picks
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* Quick nav tiles (bottom) */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <NavTile to="/events" icon={<CalendarCheck className="h-5 w-5" />} label="Upcoming" />
            <NavTile to="/events/completed" icon={<List className="h-5 w-5" />} label="Completed" />
            <NavTile to="/stores" icon={<MapPin className="h-5 w-5" />} label="Store Finder" />
            <NavTile to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Leaderboard" />
          </div>

          <div className="mt-10 text-center text-xs text-white/40">
            MetaBeys is Developed by @Karl6ix & Ran by @Aysus (@ on Discord)
          </div>
        </motion.div>
      </div>
    </>
  )
}

/* --------------------------------
   Reusable pieces
---------------------------------*/
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="isolate overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/10 bg-white/5 p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold tracking-wide text-white/80">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function KPI({ label, value, icon, hint }: { label: string; value: number | string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="isolate overflow-hidden relative rounded-3xl border border-white/10 ring-1 ring-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.03]" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{String(value)}</div>
          {hint ? <div className="mt-1 text-[11px] text-white/45">{hint}</div> : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/80">{icon}</div>
      </div>
    </div>
  )
}

function PopularityList({
  title,
  items,
  className = "",
}: { title: string; items: PopularityRow[]; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 ring-1 ring-white/10 bg-white/5 p-3", className)}>
      <div className="mb-2 text-xs uppercase tracking-wide text-white/60">{title}</div>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={it.name + i} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-2.5 py-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">{i + 1}</span>
                <span className="text-sm leading-tight line-clamp-2 whitespace-normal" title={it.name}>
                  {it.name}
                </span>
              </div>
              <div className="text-xs tabular-nums text-white/70">{it.pct}%</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-white/60">No data in range.</div>
      )}
    </div>
  )
}

function TopCutRow({ players }: { players?: Player[] }) {
  if (!players?.length) return <div className="mt-2 text-xs text-white/50">Top cut not posted.</div>
  return (
    <div className="mt-2 flex items-center gap-2">
      {players.map((p, i) => (
        <div key={p.name + i} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"}
          </span>
          <span className="text-xs">{p.name}</span>
        </div>
      ))}
    </div>
  )
}

function CountdownPill({ d, h, m, s }: { d: number; h: number; m: number; s: number }) {
  const Item = ({ v, u }: { v: number; u: string }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-center">
      <div className="text-sm font-semibold leading-none tabular-nums">{v.toString().padStart(2, "0")}</div>
      <div className="mt-0.5 text-[10px] text-white/60">{u}</div>
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      <Item v={d} u="D" />
      <Item v={h} u="H" />
      <Item v={m} u="M" />
      <Item v={s} u="S" />
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs overflow-auto">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-2.5 py-1 rounded-lg transition whitespace-nowrap",
              active ? "bg-indigo-600/90 text-white" : "text-white/70 hover:bg-white/10"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ComboBox({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => setQuery(value), [value])

  const norm = (s: string) => s.toLowerCase().trim()
  const filtered = useMemo(() => {
    const q = norm(query)
    if (!q) return options.slice(0, 12)
    const starts = options.filter(o => norm(o).startsWith(q))
    const includes = options.filter(o => !norm(o).startsWith(q) && norm(o).includes(q))
    return [...starts, ...includes].slice(0, 12)
  }, [options, query])

  const commit = (next: string) => {
    onChange(next)
    setQuery(next)
    setOpen(false)
  }

  return (
    <label className="block relative">
      <div className="mb-1 flex items-center justify-between text-xs text-white/60">
        <span>{label}</span>
        {value && (
          <button
            type="button"
            onMouseDown={() => commit("")}
            onTouchStart={() => commit("")}
            className="text-[11px] rounded-md px-1.5 py-0.5 border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || `Any ${label.toLowerCase()}`}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-indigo-500/50"
      />

      {open && (
        <div
          className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-white/10 bg-[#0b1220]/95 backdrop-blur-sm p-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.length ? (
            filtered.map(o => (
              <button
                key={o}
                type="button"
                onMouseDown={() => commit(o)}
                onTouchStart={() => commit(o)}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10", o === value && "bg-white/10")}
              >
                {o}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-white/60">No matches.</div>
          )}

          {!query && (
            <button
              type="button"
              onMouseDown={() => commit("")}
              onTouchStart={() => commit("")}
              className="mt-1 w-full text-left px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/10"
            >
              Any {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </label>
  )
}

function NavTile({ to, icon, label }: { to: string; icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group isolate overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/10 bg-white/5 p-4 transition hover:bg-white/10"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/80">{icon}</div>
        <div className="font-medium">{label}</div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-white/60 group-hover:text-white/75">
        Open <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  )
}

function Skeleton({ height = "h-10" }: { height?: string }) {
  return <div className={cn("w-full animate-pulse rounded-2xl bg-white/5", height)} />
}

/* ---------- Mini leaderboard row ---------- */
function LeaderboardMiniRow({ rank, p }: { rank: number; p: LeaderboardUserD }) {
  const name = (p.username && p.username.trim()) || p.displayName || p.slug

  // just read the precomputed numbers
  const firsts = p._firsts
  const seconds = p._seconds
  const thirds = p._thirds
  const topCutsOnly = p._topcutsOnly
  const total = p._total

  const tone =
    rank === 1
      ? "from-yellow-400/20 to-amber-500/10"
      : rank === 2
      ? "from-slate-300/15 to-slate-500/10"
      : rank === 3
      ? "from-amber-500/20 to-amber-700/10"
      : "from-indigo-400/10 to-sky-500/5"

  return (
    <Link
      to={`/u/${encodeURIComponent(p.slug)}`}
      className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br ${tone} p-2.5 hover:bg-white/10 transition`}
    >
      <div className="shrink-0 grid place-items-center h-8 w-8 rounded-lg bg-white/10 border border-white/10 font-bold">
        {rank}
      </div>

      <img
        src={p.avatarDataUrl || "/default-avatar.png"}
        alt={p.avatarDataUrl ? name : ""}
        className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
        draggable={false}
      />

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-tight">{name}</div>
        <div className="text-[11px] text-white/60">{total} results</div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-yellow-200">
          🏆 {firsts}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/40 bg-slate-300/10 px-2 py-0.5 text-slate-200">
          🥈 {seconds}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
          🥉 {thirds}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-indigo-200">
          🎖️ {topCutsOnly}
        </span>
      </div>
    </Link>
  )
}
