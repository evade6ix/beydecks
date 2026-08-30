import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { io } from "socket.io-client"
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  FlaskConical,
  List,
  MapPin,
  MessageSquare,
  Trophy,
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

function cutoffFor(range: TimeRange) {
  const now = new Date()
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (range === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  if (range === "year") return new Date(now.getFullYear(), 0, 1)
  return null
}

export default function Home() {
  const [recent, setRecent] = useState<EventItem[]>([])
  const [completed, setCompleted] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [stats, setStats] = useState({ totalCompleted: 0, monthEvents: 0 })
  const [topBlade, setTopBlade] = useState("—")

  const [tlBlade, setTlBlade] = useState("")
  const [tlAssist, setTlAssist] = useState("")
  const [tlRatchet, setTlRatchet] = useState("")
  const [tlBit, setTlBit] = useState("")

  const { user } = (useAuth?.() as any) || {}
  const username = ((user?.username as string) || (user?.email ? String(user.email).split("@")[0] : "")).trim()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API}/events`)
        const payload = await response.json()
        const events: EventItem[] = Array.isArray(payload) ? payload : []
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const finished = events
          .filter(event => new Date(event.endTime) < now)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setRecent(finished.slice(0, 6))
        setCompleted(finished)
        setStats({
          totalCompleted: finished.length,
          monthEvents: finished.filter(event => new Date(event.endTime) >= startOfMonth).length,
        })

        const bladeCount = new Map<string, number>()
        for (const event of finished) {
          for (const player of event.topCut ?? []) {
            for (const combo of player.combos ?? []) {
              if (combo.blade) bladeCount.set(combo.blade, (bladeCount.get(combo.blade) || 0) + 1)
            }
          }
        }
        setTopBlade(Array.from(bladeCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—")
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

  const filteredEvents = useMemo(() => {
    const cutoff = cutoffFor(timeRange)
    return cutoff ? completed.filter(event => new Date(event.endTime) >= cutoff) : completed
  }, [completed, timeRange])

  const meta = useMemo(() => {
    const blades = new Map<string, number>()
    const assists = new Map<string, number>()
    const ratchets = new Map<string, number>()
    const bits = new Map<string, number>()
    let total = 0
    let assistTotal = 0

    for (const event of filteredEvents) {
      for (const player of event.topCut ?? []) {
        for (const combo of player.combos ?? []) {
          total++
          if (combo.blade) blades.set(combo.blade, (blades.get(combo.blade) || 0) + 1)
          if (combo.assistBlade) {
            assistTotal++
            assists.set(combo.assistBlade, (assists.get(combo.assistBlade) || 0) + 1)
          }
          if (combo.ratchet) ratchets.set(combo.ratchet, (ratchets.get(combo.ratchet) || 0) + 1)
          if (combo.bit) bits.set(combo.bit, (bits.get(combo.bit) || 0) + 1)
        }
      }
    }

    const rows = (source: Map<string, number>, denominator: number): PopularityRow[] =>
      Array.from(source.entries())
        .map(([name, count]) => ({ name, count, pct: denominator ? Math.round((count / denominator) * 1000) / 10 : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    return {
      total,
      assistTotal,
      blades: rows(blades, total),
      assists: rows(assists, assistTotal),
      ratchets: rows(ratchets, total),
      bits: rows(bits, total),
      options: {
        blades: Array.from(blades.keys()).sort(),
        assists: Array.from(assists.keys()).sort(),
        ratchets: Array.from(ratchets.keys()).sort(),
        bits: Array.from(bits.keys()).sort(),
      },
    }
  }, [filteredEvents])

  const lab = useMemo(() => {
    let total = 0
    let matches = 0
    const events: { id: EventItem["id"]; title: string; date: string }[] = []

    for (const event of filteredEvents) {
      let eventMatched = false
      for (const player of event.topCut ?? []) {
        for (const combo of player.combos ?? []) {
          total++
          const matched =
            (!tlBlade || combo.blade === tlBlade) &&
            (!tlAssist || combo.assistBlade === tlAssist) &&
            (!tlRatchet || combo.ratchet === tlRatchet) &&
            (!tlBit || combo.bit === tlBit)

          if (matched) {
            matches++
            eventMatched = true
          }
        }
      }
      if (eventMatched) events.push({ id: event.id, title: event.title, date: fmt.format(new Date(event.endTime)) })
    }

    return {
      matches,
      total,
      pct: total ? Math.round((matches / total) * 1000) / 10 : 0,
      events,
    }
  }, [filteredEvents, tlBlade, tlAssist, tlRatchet, tlBit, fmt])

  const attendeeCount = (event: EventItem): number | undefined => {
    const direct = [event.attendeeCount, event.participants, event.playerCount, event.attendees, event.attendance, event.players]
      .find(value => typeof value === "number" && value > 0) as number | undefined
    if (direct) return direct
    if (Array.isArray(event.players)) return event.players.length
    if (Array.isArray(event.participants)) return event.participants.length
    if (Array.isArray(event.attendeeIds)) return event.attendeeIds.length
    if (Array.isArray(event.participantIds)) return event.participantIds.length
    if (typeof event.participantList === "string") return event.participantList.split(",").filter(Boolean).length || undefined
    return undefined
  }

  return (
    <>
      <Helmet>
        <title>MetaBeys — Competitive Beyblade X Dashboard</title>
        <meta name="description" content="Competitive Beyblade X results, meta trends, tournament analysis, and community tools." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MetaBeys — Competitive Beyblade X Dashboard" />
        <meta property="og:url" content="https://www.metabeys.com/home" />
        <meta property="og:image" content="https://www.metabeys.com/mlogo.png" />
      </Helmet>

      <main className="min-h-[100dvh] bg-[#0b0d10] pb-24 text-white">
        <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <header className="flex flex-col gap-6 border-b border-white/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-medium text-white/40">MetaBeys</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-[44px]">
                {username ? `Welcome back, ${username}.` : "Competitive Beyblade X, in one place."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
                Follow tournament results, see what is performing, and research your next build from real competitive data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link to="/submit" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#111419] px-4 text-sm font-medium text-white/75 transition hover:border-white/20 hover:text-white">
                <CalendarCheck className="h-4 w-4" /> Submit event
              </Link>
              <Link to="/tournament-lab" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90">
                Tournament Lab <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {showAnnouncement && (
            <div className="relative mt-5 rounded-xl border border-white/[0.08] bg-[#111419] px-12 py-3 text-sm">
              <p className="text-center leading-6 text-white/60">
                <span className="font-semibold text-white/85">Mystery bounty:</span> Win a WBO with Gear Rush. Video proof must be submitted on Discord.
              </p>
              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] lg:grid-cols-4">
            <Metric label="Completed events" value={stats.totalCompleted} />
            <Metric label="This month" value={stats.monthEvents} />
            <Metric label="Top blade" value={topBlade} />
            <Metric label="Top-cut combos" value={meta.total} />
          </section>

          <section className="mt-6">
            <Panel className="p-0">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/75">
                    <Trophy className="h-4 w-4 text-white/35" /> Latest tournament results
                  </div>
                  <p className="mt-1.5 text-sm text-white/40">The newest completed events in the MetaBeys database.</p>
                </div>
                <Link to="/events/completed" className="shrink-0 text-xs font-medium text-white/35 transition hover:text-white">View all</Link>
              </div>

              <div className="grid divide-y divide-white/[0.07] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="divide-y divide-white/[0.07]">
                  {loading ? (
                    <div className="space-y-2 p-5"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                  ) : recent.slice(0, 3).length ? recent.slice(0, 3).map(event => (
                    <ResultRow key={event.id} event={event} fmt={fmt} attendeeCount={attendeeCount} />
                  )) : (
                    <div className="p-5 text-sm text-white/40">No completed events yet.</div>
                  )}
                </div>

                <div className="divide-y divide-white/[0.07]">
                  {loading ? (
                    <div className="space-y-2 p-5"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                  ) : recent.slice(3, 6).length ? recent.slice(3, 6).map(event => (
                    <ResultRow key={event.id} event={event} fmt={fmt} attendeeCount={attendeeCount} />
                  )) : (
                    <div className="p-5 text-sm text-white/30">More results will appear here as they are added.</div>
                  )}
                </div>
              </div>
            </Panel>
          </section>

          <section className="mt-6">
            <Panel className="p-0">
              <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/75"><BarChart3 className="h-4 w-4 text-white/35" /> Meta snapshot</div>
                  <p className="mt-1.5 text-sm text-white/40">Top-cut usage across the selected period.</p>
                </div>
                <RangeTabs value={timeRange} onChange={setTimeRange} />
              </div>
              <div className="grid divide-y divide-white/[0.07] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
                <Popularity title="Blades" items={meta.blades} />
                <Popularity title="Assist blades" items={meta.assists} />
                <Popularity title="Ratchets" items={meta.ratchets} />
                <Popularity title="Bits" items={meta.bits} />
              </div>
              <div className="border-t border-white/[0.08] px-5 py-3 text-xs text-white/30 sm:px-6">
                {meta.total.toLocaleString()} top-cut combos analyzed{meta.assistTotal ? ` · ${meta.assistTotal.toLocaleString()} with assist blades` : ""}
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel>
              <div className="border-b border-white/[0.08] pb-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/75"><FlaskConical className="h-4 w-4 text-white/35" /> Tournament Lab</div>
                <p className="mt-1.5 text-sm text-white/40">Check how often a part or full combination appeared in top cut.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <PartSelect label="Blade" value={tlBlade} onChange={setTlBlade} options={meta.options.blades} />
                <PartSelect label="Assist blade" value={tlAssist} onChange={setTlAssist} options={meta.options.assists} />
                <PartSelect label="Ratchet" value={tlRatchet} onChange={setTlRatchet} options={meta.options.ratchets} />
                <PartSelect label="Bit" value={tlBit} onChange={setTlBit} options={meta.options.bits} />
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#0d1014] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">Appearance rate</div>
                  <div className="mt-1 text-3xl font-semibold tracking-[-0.03em]">{lab.pct}%</div>
                  <div className="mt-1 text-xs text-white/35">{lab.matches} of {lab.total} top-cut combos</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setTlBlade(""); setTlAssist(""); setTlRatchet(""); setTlBit("") }} className="h-9 rounded-lg border border-white/10 px-3 text-sm text-white/50 transition hover:text-white">Reset</button>
                  <Link to="/tournament-lab" className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-semibold text-black">Open Lab</Link>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-white/30">Matching events</div>
                {lab.events.length ? (
                  <div className="max-h-64 divide-y divide-white/[0.07] overflow-auto rounded-xl border border-white/[0.08]">
                    {lab.events.slice(0, 12).map(event => (
                      <Link key={event.id} to={`/events/${event.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/[0.03]">
                        <div className="min-w-0"><div className="truncate text-sm font-medium text-white/70">{event.title}</div><div className="mt-0.5 text-xs text-white/30">{event.date}</div></div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
                      </Link>
                    ))}
                  </div>
                ) : <div className="rounded-xl border border-white/[0.08] px-4 py-6 text-sm text-white/35">No matching events in this range.</div>}
              </div>
            </Panel>

            <ChatWidget username={username} />
          </section>

          <nav className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Quick links">
            <QuickLink to="/leaderboard" icon={<BarChart3 className="h-4 w-4" />} title="Beyblade Meta" copy="Full rankings and usage data" />
            <QuickLink to="/events/completed" icon={<List className="h-4 w-4" />} title="Completed Events" copy="Browse tournament history" />
            <QuickLink to="/stores" icon={<MapPin className="h-4 w-4" />} title="Store Finder" copy="Find stores in the community" />
          </nav>

          <div className="mt-10 border-t border-white/[0.07] pt-6 text-center text-xs leading-5 text-white/20">
            MetaBeys is owned by Karl6ix, FlamingoPapi, SwiftMFB · Logo(s) by AustieFrosty · Honorable mention to Aysus
          </div>
        </div>
      </main>
    </>
  )
}

function ResultRow({
  event,
  fmt,
  attendeeCount,
}: {
  event: EventItem
  fmt: Intl.DateTimeFormat
  attendeeCount: (event: EventItem) => number | undefined
}) {
  const attendees = attendeeCount(event)
  return (
    <Link to={`/events/${event.id}`} className="group flex min-h-[112px] items-start justify-between gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:px-6">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white/75 group-hover:text-white">{event.title}</div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-white/30">
          <span>{fmt.format(new Date(event.endTime))}</span><span>·</span><span>{event.store}</span>
          {attendees ? <><span>·</span><span>{attendees} players</span></> : null}
        </div>
        {event.topCut?.[0]?.name ? <div className="mt-3 text-xs text-white/40">Winner: <span className="text-white/65">{event.topCut[0].name}</span></div> : null}
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/15 transition group-hover:text-white/55" />
    </Link>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/[0.08] bg-[#111419] p-5 sm:p-6 ${className}`}>{children}</div>
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="border-b border-r border-white/[0.07] px-4 py-5 lg:border-b-0 sm:px-5"><div className="text-xs font-medium text-white/30">{label}</div><div className="mt-1.5 truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl" title={String(value)}>{String(value)}</div></div>
}

function RangeTabs({ value, onChange }: { value: TimeRange; onChange: (value: TimeRange) => void }) {
  const options: { label: string; value: TimeRange }[] = [{ label: "All", value: "all" }, { label: "30d", value: "30d" }, { label: "90d", value: "90d" }, { label: "This year", value: "year" }]
  return <div className="inline-flex w-fit rounded-lg border border-white/[0.08] bg-[#0d1014] p-1 text-xs">{options.map(option => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-md px-2.5 py-1.5 transition ${option.value === value ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>{option.label}</button>)}</div>
}

function Popularity({ title, items }: { title: string; items: PopularityRow[] }) {
  return <div className="p-5 sm:p-6"><div className="text-xs font-medium uppercase tracking-[0.11em] text-white/25">{title}</div>{items.length ? <ol className="mt-4 space-y-3">{items.map((item, index) => <li key={item.name} className="flex items-center gap-3"><span className="w-4 shrink-0 text-xs tabular-nums text-white/20">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-white/70" title={item.name}>{item.name}</span><span className="shrink-0 tabular-nums text-white/35">{item.pct}%</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-white/40" style={{ width: `${Math.min(100, item.pct)}%` }} /></div></div></li>)}</ol> : <div className="mt-4 text-sm text-white/30">No data in range.</div>}</div>
}

function PartSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><div className="mb-1.5 text-xs text-white/30">{label}</div><select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#0d1014] px-3 text-sm text-white/70 outline-none focus:border-white/20"><option value="">Any {label.toLowerCase()}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
}

function QuickLink({ to, icon, title, copy }: { to: string; icon: React.ReactNode; title: string; copy: string }) {
  return <Link to={to} className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#111419] p-4 transition hover:border-white/[0.15]"><div className="flex min-w-0 items-center gap-3"><span className="text-white/30">{icon}</span><div className="min-w-0"><div className="text-sm font-medium text-white/70">{title}</div><div className="mt-0.5 truncate text-xs text-white/30">{copy}</div></div></div><ChevronRight className="h-4 w-4 shrink-0 text-white/15 transition group-hover:text-white/50" /></Link>
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />
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
    const activeSocket = io(API.replace(/\/api$/, ""), { transports: ["websocket"] })
    setSocket(activeSocket)
    activeSocket.emit("join", username)
    activeSocket.on("messageHistory", (history: any[]) => setMessages(history))
    activeSocket.on("message", (message: any) => setMessages(current => [...current, message]))
    activeSocket.on("onlineUsers", (users: string[]) => setOnline(users))
    return () => {
      activeSocket.disconnect()
    }
  }, [username])

  const send = () => {
    if (!text.trim() || !username || !socket) return
    socket.emit("message", { user: username, text: text.trim(), ts: Date.now() })
    setText("")
  }

  return (
    <Panel className="flex min-h-[520px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/75"><MessageSquare className="h-4 w-4 text-white/35" /> Community chat</div>
        <div className="flex items-center gap-1.5 text-xs text-white/30"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {online.length} online</div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div ref={messagesRef} className="h-[360px] flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length ? messages.map((message, index) => <div key={`${message.ts}-${index}`}><div className="text-[11px] text-white/25">{message.user} · {new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div><div className="mt-1 text-sm leading-6 text-white/65">{message.text}</div></div>) : <div className="text-sm text-white/30">No messages yet.</div>}
        </div>
        <div className="hidden w-32 border-l border-white/[0.07] p-4 sm:block"><div className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/20">Online</div><div className="mt-3 space-y-2">{online.slice(0, 12).map(name => <div key={name} className="truncate text-xs text-white/40" title={name}>{name}</div>)}</div></div>
      </div>
      <div className="border-t border-white/[0.08] p-4">
        {username ? <div className="flex gap-2"><input value={text} onChange={event => setText(event.target.value)} onKeyDown={event => event.key === "Enter" && send()} placeholder="Write a message" className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#0d1014] px-3 text-sm text-white/70 outline-none placeholder:text-white/20 focus:border-white/20" /><button type="button" onClick={send} className="h-10 rounded-lg bg-white px-4 text-sm font-semibold text-black">Send</button></div> : <Link to="/user-auth" className="inline-flex items-center gap-2 text-sm font-medium text-white/55 hover:text-white">Sign in to join chat <ArrowRight className="h-4 w-4" /></Link>}
      </div>
    </Panel>
  )
}
