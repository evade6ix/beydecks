import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { io } from "socket.io-client"
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Clock,
  FlaskConical,
  List,
  MapPin,
  MessageSquare,
  Trophy,
  Users,
  X,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

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

type TimeRange = "all" | "30d" | "90d" | "year"
type PopularityRow = { name: string; count: number; pct: number }

const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ")

function cutoffFor(range: TimeRange) {
  const now = new Date()
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (range === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  if (range === "year") return new Date(now.getFullYear(), 0, 1)
  return null
}

function useCountdown(date?: string | null) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!date) return { d: 0, h: 0, m: 0 }
  const diff = Math.max(0, new Date(date).getTime() - now)
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff / 3_600_000) % 24),
    m: Math.floor((diff / 60_000) % 60),
  }
}

export default function Home() {
  const [upcoming, setUpcoming] = useState<EventItem | null>(null)
  const [recent, setRecent] = useState<EventItem[]>([])
  const [completed, setCompleted] = useState<EventItem[]>([])
  const [stats, setStats] = useState({ totalUpcoming: 0, totalCompleted: 0, monthEvents: 0 })
  const [topBladeName, setTopBladeName] = useState("—")
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [showAnnouncement, setShowAnnouncement] = useState(true)

  const [tlBlade, setTlBlade] = useState("")
  const [tlAssist, setTlAssist] = useState("")
  const [tlRatchet, setTlRatchet] = useState("")
  const [tlBit, setTlBit] = useState("")

  const [popularity, setPopularity] = useState<{
    totalCombos: number
    totalAssistCombos: number
    blades: PopularityRow[]
    assistBlades: PopularityRow[]
    ratchets: PopularityRow[]
    bits: PopularityRow[]
  }>({ totalCombos: 0, totalAssistCombos: 0, blades: [], assistBlades: [], ratchets: [], bits: [] })

  const { user } = (useAuth?.() as any) || {}
  const username = ((user?.username as string) || (user?.email ? String(user.email).split("@")[0] : "")).trim()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API}/events`)
        const eventsData = await response.json()
        const events: EventItem[] = Array.isArray(eventsData) ? eventsData : []
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const futureEvents = events
          .filter(event => new Date(event.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        const completedEvents = events
          .filter(event => new Date(event.endTime) < now)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setUpcoming(futureEvents[0] || null)
        setRecent(completedEvents.slice(0, 5))
        setCompleted(completedEvents)
        setStats({
          totalUpcoming: futureEvents.length,
          totalCompleted: completedEvents.length,
          monthEvents: events.filter(event => new Date(event.startTime) >= startOfMonth).length,
        })

        const bladeMap: Record<string, number> = {}
        for (const event of completedEvents) {
          for (const player of event.topCut ?? []) {
            for (const combo of player.combos ?? []) {
              const blade = (combo.blade || "").trim()
              if (blade) bladeMap[blade] = (bladeMap[blade] || 0) + 1
            }
          }
        }

        setTopBladeName(Object.entries(bladeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—")
      } catch (error) {
        console.warn("Home load failed", error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }),
    []
  )

  const countdown = useCountdown(upcoming?.startTime || null)

  const filteredEvents = useMemo(() => {
    const start = cutoffFor(timeRange)
    return start ? completed.filter(event => new Date(event.endTime) >= start) : completed
  }, [completed, timeRange])

  useEffect(() => {
    const maps = {
      blade: new Map<string, number>(),
      assistBlade: new Map<string, number>(),
      ratchet: new Map<string, number>(),
      bit: new Map<string, number>(),
    }
    let total = 0
    let assistTotal = 0

    for (const event of filteredEvents) {
      for (const player of event.topCut ?? []) {
        for (const combo of player.combos ?? []) {
          total++
          if (combo.blade) maps.blade.set(combo.blade, (maps.blade.get(combo.blade) || 0) + 1)
          if (combo.assistBlade) {
            assistTotal++
            maps.assistBlade.set(combo.assistBlade, (maps.assistBlade.get(combo.assistBlade) || 0) + 1)
          }
          if (combo.ratchet) maps.ratchet.set(combo.ratchet, (maps.ratchet.get(combo.ratchet) || 0) + 1)
          if (combo.bit) maps.bit.set(combo.bit, (maps.bit.get(combo.bit) || 0) + 1)
        }
      }
    }

    const toRows = (map: Map<string, number>, denominator: number) =>
      Array.from(map.entries())
        .map(([name, count]) => ({ name, count, pct: denominator ? Math.round((count / denominator) * 1000) / 10 : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    setPopularity({
      totalCombos: total,
      totalAssistCombos: assistTotal,
      blades: toRows(maps.blade, total),
      assistBlades: toRows(maps.assistBlade, assistTotal),
      ratchets: toRows(maps.ratchet, total),
      bits: toRows(maps.bit, total),
    })
  }, [filteredEvents])

  const parts = useMemo(() => {
    const blades = new Set<string>()
    const assists = new Set<string>()
    const ratchets = new Set<string>()
    const bits = new Set<string>()

    for (const event of filteredEvents) {
      for (const player of event.topCut ?? []) {
        for (const combo of player.combos ?? []) {
          if (combo.blade) blades.add(combo.blade)
          if (combo.assistBlade) assists.add(combo.assistBlade)
          if (combo.ratchet) ratchets.add(combo.ratchet)
          if (combo.bit) bits.add(combo.bit)
        }
      }
    }

    return {
      blades: Array.from(blades).sort(),
      assistBlades: Array.from(assists).sort(),
      ratchets: Array.from(ratchets).sort(),
      bits: Array.from(bits).sort(),
    }
  }, [filteredEvents])

  const tlStats = useMemo(() => {
    let total = 0
    let matches = 0
    const eventsMatched: { id: EventItem["id"]; title: string; date: string }[] = []

    for (const event of filteredEvents) {
      let eventMatched = false
      for (const player of event.topCut ?? []) {
        for (const combo of player.combos ?? []) {
          total++
          const matchesSelection =
            (!tlBlade || combo.blade === tlBlade) &&
            (!tlAssist || combo.assistBlade === tlAssist) &&
            (!tlRatchet || combo.ratchet === tlRatchet) &&
            (!tlBit || combo.bit === tlBit)

          if (matchesSelection) {
            matches++
            eventMatched = true
          }
        }
      }

      if (eventMatched) eventsMatched.push({ id: event.id, title: event.title, date: fmt.format(new Date(event.endTime)) })
    }

    return {
      pct: total ? Math.round((matches / total) * 1000) / 10 : 0,
      matches,
      total,
      eventsMatched,
    }
  }, [filteredEvents, tlBlade, tlAssist, tlRatchet, tlBit, fmt])

  const getAttendeeCount = (event: EventItem): number | undefined => {
    const firstNumber = (...values: any[]) => values.find(value => typeof value === "number" && value > 0) as number | undefined
    const numeric = firstNumber(
      event.attendeeCount,
      event.participants,
      event.playerCount,
      event.attendees,
      event.attendance,
      typeof event.players === "number" ? event.players : undefined
    )
    if (numeric) return numeric
    if (Array.isArray(event.players)) return event.players.length
    if (Array.isArray(event.participants)) return event.participants.length
    if (Array.isArray(event.attendeeIds)) return event.attendeeIds.length
    if (Array.isArray(event.participantIds)) return event.participantIds.length
    if (typeof event.participantList === "string") {
      return event.participantList.split(",").map(value => value.trim()).filter(Boolean).length || undefined
    }
    return undefined
  }

  return (
    <>
      <Helmet>
        <title>MetaBeys — Competitive Beyblade X Dashboard</title>
        <meta
          name="description"
          content="Competitive Beyblade X results, meta trends, upcoming events, tournament analysis, and community tools."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MetaBeys — Competitive Beyblade X Dashboard" />
        <meta property="og:url" content="https://www.metabeys.com/home" />
        <meta property="og:image" content="https://www.metabeys.com/mlogo.png" />
      </Helmet>

      <main className="min-h-[100dvh] bg-[#0b0d10] pb-24 text-white">
        <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <header className="flex flex-col gap-6 border-b border-white/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-medium text-white/45">MetaBeys</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-[44px]">
                {username ? `Welcome back, ${username}.` : "Competitive Beyblade X, in one place."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
                Follow the tournament scene, see what is performing, and research your next build from real results.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#111419] px-4 text-sm font-medium text-white/80 transition hover:border-white/20 hover:text-white"
              >
                <CalendarCheck className="h-4 w-4" /> Submit event
              </Link>
              <Link
                to="/tournament-lab"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Tournament Lab <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {showAnnouncement && (
            <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#111419] px-4 py-3 text-sm">
              <p className="leading-6 text-white/65">
                <span className="font-semibold text-white/90">Mystery bounty:</span> Win a WBO with Gear Rush. Video proof must be submitted on Discord.
              </p>
              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="mt-0.5 shrink-0 text-white/35 transition hover:text-white"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] lg:grid-cols-4">
            <Metric label="Upcoming" value={stats.totalUpcoming} />
            <Metric label="Completed" value={stats.totalCompleted} />
            <Metric label="This month" value={stats.monthEvents} />
            <Metric label="Top blade" value={topBladeName} />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Panel className="p-0">
              <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <SectionHeading icon={<Clock className="h-4 w-4" />} title="Next event" />
              </div>

              <div className="p-5 sm:p-6">
                {loading ? (
                  <Skeleton className="h-40" />
                ) : upcoming ? (
                  <div className="flex min-h-[180px] flex-col justify-between gap-8 sm:flex-row sm:items-end">
                    <div className="max-w-2xl">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/35">
                        {fmt.format(new Date(upcoming.startTime))}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{upcoming.title}</h2>
                      <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
                        <MapPin className="h-4 w-4" /> {upcoming.store}
                      </div>
                      <Link
                        to={`/events/${upcoming.id}`}
                        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
                      >
                        Event details <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <Countdown d={countdown.d} h={countdown.h} m={countdown.m} />
                  </div>
                ) : (
                  <div className="py-12 text-sm text-white/50">No upcoming events found.</div>
                )}
              </div>
            </Panel>

            <Panel className="p-0">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <SectionHeading icon={<Trophy className="h-4 w-4" />} title="Recent results" />
                <Link to="/events/completed" className="text-xs font-medium text-white/45 transition hover:text-white">View all</Link>
              </div>

              <div className="divide-y divide-white/[0.07]">
                {loading ? (
                  <div className="space-y-2 p-5"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
                ) : recent.length ? (
                  recent.map(event => (
                    <RecentEvent key={event.id} event={event} attendees={getAttendeeCount(event)} fmt={fmt} />
                  ))
                ) : (
                  <div className="p-5 text-sm text-white/50">No completed events yet.</div>
                )}
              </div>
            </Panel>
          </section>

          <section className="mt-6">
            <Panel className="p-0">
              <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title="Meta snapshot" />
                  <p className="mt-1.5 text-sm text-white/45">Top-cut usage across the selected period.</p>
                </div>
                <Segmented value={timeRange} onChange={setTimeRange} />
              </div>

              <div className="grid divide-y divide-white/[0.07] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
                <PopularityList title="Blades" items={popularity.blades} />
                <PopularityList title="Assist blades" items={popularity.assistBlades} />
                <PopularityList title="Ratchets" items={popularity.ratchets} />
                <PopularityList title="Bits" items={popularity.bits} />
              </div>

              <div className="border-t border-white/[0.08] px-5 py-3 text-xs text-white/35 sm:px-6">
                {popularity.totalCombos.toLocaleString()} top-cut combos analyzed
                {popularity.totalAssistCombos ? ` · ${popularity.totalAssistCombos.toLocaleString()} with assist blades` : ""}
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel>
              <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-5">
                <SectionHeading icon={<FlaskConical className="h-4 w-4" />} title="Tournament Lab" />
                <p className="text-sm text-white/45">Check how often a part or full combination appeared in top cut.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ComboBox label="Blade" value={tlBlade} onChange={setTlBlade} options={parts.blades} placeholder="Any blade" />
                <ComboBox label="Assist blade" value={tlAssist} onChange={setTlAssist} options={parts.assistBlades} placeholder="Any assist" />
                <ComboBox label="Ratchet" value={tlRatchet} onChange={setTlRatchet} options={parts.ratchets} placeholder="Any ratchet" />
                <ComboBox label="Bit" value={tlBit} onChange={setTlBit} options={parts.bits} placeholder="Any bit" />
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#0d1014] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">Appearance rate</div>
                  <div className="mt-1 text-3xl font-semibold tracking-[-0.03em]">{tlStats.pct}%</div>
                  <div className="mt-1 text-xs text-white/40">{tlStats.matches} of {tlStats.total} top-cut combos</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTlBlade(""); setTlAssist(""); setTlRatchet(""); setTlBit("") }}
                    className="h-9 rounded-lg border border-white/10 px-3 text-sm text-white/60 transition hover:text-white"
                  >
                    Reset
                  </button>
                  <Link to="/tournament-lab" className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-semibold text-black">
                    Open Lab
                  </Link>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-white/35">Matching events</div>
                {tlStats.eventsMatched.length ? (
                  <div className="max-h-64 divide-y divide-white/[0.07] overflow-auto rounded-xl border border-white/[0.08]">
                    {tlStats.eventsMatched.slice(0, 12).map(event => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/[0.03]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white/80">{event.title}</div>
                          <div className="mt-0.5 text-xs text-white/35">{event.date}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] px-4 py-6 text-sm text-white/40">No matching events in this range.</div>
                )}
              </div>
            </Panel>

            <ChatWidget username={username} />
          </section>

          <nav className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Quick links">
            <QuickLink to="/leaderboard" icon={<BarChart3 className="h-4 w-4" />} title="Beyblade Meta" copy="Full rankings and usage data" />
            <QuickLink to="/events/completed" icon={<List className="h-4 w-4" />} title="Completed Events" copy="Browse tournament history" />
            <QuickLink to="/stores" icon={<MapPin className="h-4 w-4" />} title="Store Finder" copy="Find events and stores" />
          </nav>

          <div className="mt-10 border-t border-white/[0.07] pt-6 text-center text-xs leading-5 text-white/25">
            MetaBeys is owned by Karl6ix, FlamingoPapi, SwiftMFB · Logo(s) by AustieFrosty · Honorable mention to Aysus
          </div>
        </div>
      </main>
    </>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-white/[0.08] bg-[#111419] p-5 sm:p-6", className)}>{children}</div>
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
      <span className="text-white/40">{icon}</span>
      <span>{title}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-b border-r border-white/[0.07] px-4 py-5 last:border-r-0 lg:border-b-0 sm:px-5">
      <div className="text-xs font-medium text-white/35">{label}</div>
      <div className="mt-1.5 truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl" title={String(value)}>{String(value)}</div>
    </div>
  )
}

function Countdown({ d, h, m }: { d: number; h: number; m: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={`${d} days ${h} hours ${m} minutes until event`}>
      <CountdownItem value={d} label="days" />
      <CountdownItem value={h} label="hrs" />
      <CountdownItem value={m} label="min" />
    </div>
  )
}

function CountdownItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-16 rounded-xl border border-white/[0.08] bg-[#0d1014] px-3 py-2.5 text-center">
      <div className="text-lg font-semibold tabular-nums">{value.toString().padStart(2, "0")}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/30">{label}</div>
    </div>
  )
}

function RecentEvent({ event, attendees, fmt }: { event: EventItem; attendees?: number; fmt: Intl.DateTimeFormat }) {
  return (
    <Link to={`/events/${event.id}`} className="group flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.025]">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white/80 transition group-hover:text-white">{event.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/35">
          <span>{fmt.format(new Date(event.endTime))}</span>
          <span>·</span>
          <span>{event.store}</span>
          {typeof attendees === "number" && <><span>·</span><span>{attendees} players</span></>}
        </div>
        {event.topCut?.[0]?.name && <div className="mt-2 text-xs text-white/45">Winner: <span className="text-white/65">{event.topCut[0].name}</span></div>}
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/20 transition group-hover:text-white/60" />
    </Link>
  )
}

function Segmented({ value, onChange }: { value: TimeRange; onChange: (value: TimeRange) => void }) {
  const options: { label: string; value: TimeRange }[] = [
    { label: "All", value: "all" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "This year", value: "year" },
  ]

  return (
    <div className="inline-flex w-fit rounded-lg border border-white/[0.08] bg-[#0d1014] p-1 text-xs">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 transition",
            option.value === value ? "bg-white text-black" : "text-white/45 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function PopularityList({ title, items }: { title: string; items: PopularityRow[] }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="text-xs font-medium uppercase tracking-[0.11em] text-white/30">{title}</div>
      {items.length ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={item.name} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-xs tabular-nums text-white/25">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-white/75" title={item.name}>{item.name}</span>
                  <span className="shrink-0 tabular-nums text-white/40">{item.pct}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-white/45" style={{ width: `${Math.min(100, item.pct)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 text-sm text-white/35">No data in range.</div>
      )}
    </div>
  )
}

function ComboBox({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => setQuery(value), [value])

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return options.slice(0, 12)
    return options.filter(option => option.toLowerCase().includes(normalized)).slice(0, 12)
  }, [options, query])

  const commit = (next: string) => {
    onChange(next)
    setQuery(next)
    setOpen(false)
  }

  return (
    <label className="relative block">
      <div className="mb-1.5 flex items-center justify-between text-xs text-white/35">
        <span>{label}</span>
        {value && <button type="button" onMouseDown={() => commit("")} className="text-white/35 hover:text-white">Clear</button>}
      </div>
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setOpen(true); if (!event.target.value) onChange("") }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#0d1014] px-3 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-white/20"
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/[0.1] bg-[#15181d] p-1 shadow-2xl">
          <button type="button" onMouseDown={() => commit("")} className="w-full rounded-md px-3 py-2 text-left text-xs text-white/45 hover:bg-white/[0.05]">
            {placeholder}
          </button>
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={() => commit(option)}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/[0.05] hover:text-white"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </label>
  )
}

function QuickLink({ to, icon, title, copy }: { to: string; icon: React.ReactNode; title: string; copy: string }) {
  return (
    <Link to={to} className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#111419] p-4 transition hover:border-white/[0.15]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-white/35">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white/80">{title}</div>
          <div className="mt-0.5 truncate text-xs text-white/35">{copy}</div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition group-hover:text-white/60" />
    </Link>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.04]", className)} />
}

function ChatWidget({ username }: { username: string }) {
  const [socket, setSocket] = useState<any>(null)
  const [messages, setMessages] = useState<{ user: string; text: string; ts: number }[]>([])
  const [online, setOnline] = useState<string[]>([])
  const [text, setText] = useState("")
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!username) return
    const baseUrl = API.replace(/\/api$/, "")
    const activeSocket = io(baseUrl, { transports: ["websocket"] })
    setSocket(activeSocket)
    activeSocket.emit("join", username)
    activeSocket.on("messageHistory", (history: any[]) => setMessages(history))
    activeSocket.on("message", (message: any) => setMessages(current => [...current, message]))
    activeSocket.on("onlineUsers", (users: string[]) => setOnline(users))
    return () => activeSocket.disconnect()
  }, [username])

  const bannedWords = [
    "fuck", "fucking", "fucker", "fucked", "motherfucker", "shit", "shitty", "asshole", "bitch", "bitches",
    "slut", "cunt", "dick", "cock", "pussy", "twat", "prick", "wanker", "retard", "r*tard", "whore",
    "nigger", "nigga", "n1gga", "n1gger", "chink", "gook", "spic", "wetback", "kike", "paki",
  ]

  const escapeRegex = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const filterBadWords = (input: string) => {
    let output = input
    for (const word of bannedWords) output = output.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, "gi"), "****")
    return output
  }

  const send = () => {
    if (!text.trim() || !username || !socket) return
    socket.emit("message", { user: username, text: filterBadWords(text), ts: Date.now() })
    setText("")
  }

  return (
    <Panel className="flex min-h-[520px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
        <SectionHeading icon={<MessageSquare className="h-4 w-4" />} title="Community chat" />
        <div className="flex items-center gap-1.5 text-xs text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {online.length} online
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div ref={messagesRef} className="h-[360px] flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length ? messages.map((message, index) => (
            <div key={`${message.ts}-${index}`}>
              <div className="text-[11px] text-white/30">{message.user} · {new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="mt-1 text-sm leading-6 text-white/70">{message.text}</div>
            </div>
          )) : (
            <div className="text-sm text-white/35">No messages yet.</div>
          )}
        </div>

        <div className="hidden w-32 border-l border-white/[0.07] p-4 sm:block">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/25">Online</div>
          <div className="mt-3 space-y-2">
            {online.slice(0, 12).map(userName => (
              <div key={userName} className="truncate text-xs text-white/45" title={userName}>{userName}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] p-4">
        {username ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={event => event.key === "Enter" && send()}
              placeholder="Write a message"
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#0d1014] px-3 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-white/20"
            />
            <button type="button" onClick={send} className="h-10 rounded-lg bg-white px-4 text-sm font-semibold text-black">Send</button>
          </div>
        ) : (
          <Link to="/user-auth" className="inline-flex items-center gap-2 text-sm font-medium text-white/65 hover:text-white">
            Sign in to join chat <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </Panel>
  )
}
