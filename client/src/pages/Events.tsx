// src/pages/Events.tsx
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Select from "react-select"
import {
  MapPin,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Filter,
  Clock,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* ----------------------------- Types ------------------------------ */
type Event = {
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  capacity?: number
  city?: string
  region?: string
  country?: string

  // tolerant shapes for sign-ups
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

type RSOption = { label: string; value: string }
type SortBy = "Soonest" | "Capacity"

/* ----------------------------- Utils ------------------------------ */
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso))

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso))

const toOptions = (arr: readonly string[]): RSOption[] => arr.map((v) => ({ label: v, value: v }))

function getSignups(e: Event): number | undefined {
  const direct = typeof e.attendeeCount === "number" && e.attendeeCount >= 0 ? e.attendeeCount : undefined
  if (typeof direct === "number") return direct
  const firstNum = [e.participants, e.playerCount, e.attendees, e.attendance, e.players].find(
    (v) => typeof v === "number" && v >= 0
  )
  if (typeof firstNum === "number") return firstNum
  if (Array.isArray(e.players)) return e.players.length
  if (Array.isArray(e.participants)) return e.participants.length
  if (Array.isArray(e.attendeeIds)) return e.attendeeIds.length
  if (Array.isArray(e.participantIds)) return e.participantIds.length
  if (typeof e.participantList === "string") {
    const c = e.participantList.split(",").map((s) => s.trim()).filter(Boolean).length
    return c || undefined
  }
  return undefined
}

/* --------------------- Countdown (safe component) ------------------ */
function useCountdown(date?: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!date) return { d: 0, h: 0, m: 0, s: 0 }
  const diff = Math.max(0, new Date(date).getTime() - now)
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / (1000 * 60)) % 60)
  const s = Math.floor((diff / 1000) % 60)
  return { d, h, m, s }
}

function CountdownPill({ start }: { start?: string }) {
  const { d, h, m } = useCountdown(start ?? null)
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
      ⏳ Starts in {d}d {h}h {m}m
    </span>
  )
}

/* --------------- react-select theme/styles (dark) ------------------ */
const selectTheme = (theme: any) => ({
  ...theme,
  colors: {
    ...theme.colors,
    neutral0: "#111827",
    neutral80: "#e5e7eb",
    primary25: "#1f2937",
    primary50: "#374151",
    primary: "#6366f1",
  },
})
const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    minHeight: 38,
  }),
  singleValue: (base: any) => ({ ...base, color: "#e5e7eb" }),
  input: (base: any) => ({ ...base, color: "#e5e7eb" }),
  menu: (base: any) => ({ ...base, backgroundColor: "#111827", zIndex: 30 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1f2937" : "#111827",
    color: "#e5e7eb",
    cursor: "pointer",
  }),
}

/* ------------------------------- Page ------------------------------ */
export default function Events() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])

  // filter sources
  const [stores, setStores] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])

  // filters
  const [store, setStore] = useState<string>("All")
  const [country, setCountry] = useState<string>("All")
  const [sortBy, setSortBy] = useState<SortBy>("Soonest")
  const [query, setQuery] = useState<string>("")

  // pagination
  const [page, setPage] = useState<number>(1)
  const pageSize = 9

  // load upcoming once
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/events`)
        const data: Event[] = await res.json()
        const now = new Date()
        const upcoming = data
          .filter((e) => new Date(e.endTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        setEvents(upcoming)
        setStores(["All", ...Array.from(new Set(upcoming.map((e) => e.store.trim()))).sort()])
        const uniqCountries = Array.from(
          new Set(upcoming.map((e) => e.country?.trim()).filter(Boolean))
        ).sort() as string[]
        setCountries(["All", ...uniqCountries])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // derived: filtered + searched + sorted
  const filtered = useMemo(() => {
    let list = [...events]

    if (store !== "All") list = list.filter((e) => e.store.trim() === store)
    if (country !== "All") list = list.filter((e) => (e.country || "").trim() === country)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((e) =>
        [e.title, e.store, e.city, e.region, e.country]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(q))
      )
    }

    if (sortBy === "Soonest")
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    if (sortBy === "Capacity") list.sort((a, b) => (b.capacity || 0) - (a.capacity || 0))

    return list
  }, [events, store, country, sortBy, query])

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const sliceStart = (pageSafe - 1) * pageSize
  const current = filtered.slice(sliceStart, sliceStart + pageSize)

  // reset page on core changes
  useEffect(() => {
    setPage(1)
  }, [store, country, sortBy, query])

  return (
    <motion.div className="mx-auto max-w-7xl p-4 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Upcoming Events</h1>
          <p className="text-sm text-white/60 mt-1">
            {filtered.length} result{filtered.length === 1 ? "" : "s"} · Page {pageSafe} of {totalPages}
          </p>
        </div>

        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          onClick={() => {
            setStore("All")
            setCountry("All")
            setSortBy("Soonest")
            setQuery("")
            setPage(1)
          }}
        >
          Reset filters
        </button>
      </div>

      {/* Search (full width) */}
      <div className="mb-4">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, store, city, region, country…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-9 outline-none focus:border-indigo-500/50"
          />
          <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        </div>
      </div>

      {/* Filters: Store / Country / Sort by */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <p className="text-xs mb-1 text-white/60 inline-flex items-center gap-1">
            <Filter className="h-4 w-4" /> Store
          </p>
          <Select<RSOption, false>
            options={toOptions(stores)}
            value={{ label: store, value: store }}
            onChange={(opt) => setStore(opt?.value || "All")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div>
          <p className="text-xs mb-1 text-white/60 inline-flex items-center gap-1">
            <Filter className="h-4 w-4" /> Country
          </p>
          <Select<RSOption, false>
            options={toOptions(countries)}
            value={{ label: country, value: country }}
            onChange={(opt) => setCountry(opt?.value || "All")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div>
          <p className="text-xs mb-1 text-white/60 inline-flex items-center gap-1">
            <Filter className="h-4 w-4" /> Sort by
          </p>
          <Select<RSOption, false>
            options={toOptions(["Soonest", "Capacity"] as const)}
            value={{ label: sortBy, value: sortBy }}
            onChange={(opt) => setSortBy((opt?.value as SortBy) || "Soonest")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {current.map((e) => {
              const signups = getSignups(e)
              const spotsLeft =
                typeof e.capacity === "number" && typeof signups === "number"
                  ? Math.max(0, e.capacity - signups)
                  : undefined

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="group isolate overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  {/* Header strip */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-sky-500/10 border-b border-white/10">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight">{e.title}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {fmtDate(e.startTime)}
                          <span className="mx-1">·</span>
                          <Clock className="h-3.5 w-3.5" />
                          {fmtTime(e.startTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.store}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/events/${e.id}`}
                      className="shrink-0 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm hover:bg-indigo-500"
                    >
                      View
                    </Link>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    {(e.city || e.region || e.country) && (
                      <div className="text-sm text-white/70">
                        <MapPin className="mr-1 inline h-4 w-4 translate-y-[1px]" />
                        {[e.city, e.region, e.country].filter(Boolean).join(", ")}
                      </div>
                    )}

                    {/* Pills row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <CountdownPill start={e.startTime} />

                      {typeof e.capacity === "number" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <Users className="h-3.5 w-3.5" />
                          Capacity: {e.capacity}
                          {typeof spotsLeft === "number" && (
                            <span className="ml-1 text-white/70">({spotsLeft} left)</span>
                          )}
                        </span>
                      )}

                      {e.buyLink && (
                        <a
                          href={e.buyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                        >
                          🎟️ Buy Ticket
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
            disabled={pageSafe === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            Page {pageSafe} / {totalPages}
          </span>

          <button
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}
