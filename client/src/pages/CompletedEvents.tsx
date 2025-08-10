import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Select from "react-select"
import {
  MapPin,
  Users,
  Trophy,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* --------------------------------
   Types
---------------------------------*/
type Combo = { blade: string; ratchet: string; bit: string }
type Player = { name: string; combos?: Combo[] }

type Event = {
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  topCut?: Player[]
  capacity?: number
  attendeeCount?: number
  city?: string
  region?: string
  country?: string

  participants?: number | any[]
  playerCount?: number
  players?: number | any[]
  attendees?: number | any[]
  attendance?: number
  participantIds?: any[]
  attendeeIds?: any[]
  participantList?: string
}

type SortBy = "Newest" | "Oldest" | "Most Players"
type RSOption = { label: string; value: string }

/* --------------------------------
   Utils
---------------------------------*/
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso)
  )

const toOptions = (arr: readonly string[]): RSOption[] => arr.map((x) => ({ label: x, value: x }))

const PAGE_SIZE = 9 // fixed per page

function getAttendeeCount(e: Event): number | undefined {
  const direct = typeof e.attendeeCount === "number" && e.attendeeCount > 0 ? e.attendeeCount : undefined
  if (direct) return direct

  const nums = [e.participants, e.playerCount, e.attendees, e.attendance, e.players].filter(
    (v): v is number => typeof v === "number"
  )
  if (nums[0] && nums[0] > 0) return nums[0]

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

/* --------------------------------
   react-select theme/styles (dark)
---------------------------------*/
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

/* --------------------------------
   Page
---------------------------------*/
export default function CompletedEvents() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [stores, setStores] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])

  // keep only: Store, Country, Sort
  const [store, setStore] = useState<string>(searchParams.get("store") || "All")
  const [country, setCountry] = useState<string>(searchParams.get("country") || "All")
  const [sortBy, setSortBy] = useState<SortBy>((searchParams.get("sort") as SortBy) || "Newest")
  const [query, setQuery] = useState<string>(searchParams.get("q") || "")

  // pagination (fixed page size)
  const [page, setPage] = useState<number>(Number(searchParams.get("page")) || 1)

  // sync URL
  const updateSearch = (next: Partial<Record<string, string>>) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      Object.entries(next).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") p.delete(k)
        else p.set(k, v)
      })
      return p
    })
  }

  // data load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/events`)
        const data: Event[] = await res.json()

        const past = data
          .filter((e) => new Date(e.endTime) < new Date())
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setEvents(past)
        setStores(["All", ...Array.from(new Set(past.map((e) => e.store.trim()))).sort()])
        const uniqCountries = Array.from(
          new Set(past.map((e) => e.country?.trim()).filter(Boolean))
        ).sort() as string[]
        setCountries(["All", ...uniqCountries])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // filtered + searched + sorted list
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

    if (sortBy === "Newest")
      list.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    if (sortBy === "Oldest")
      list.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
    if (sortBy === "Most Players")
      list.sort((a, b) => (getAttendeeCount(b) || 0) - (getAttendeeCount(a) || 0))

    return list
  }, [events, store, country, sortBy, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const sliceStart = (pageSafe - 1) * PAGE_SIZE
  const current = filtered.slice(sliceStart, sliceStart + PAGE_SIZE)

  // keep URL in sync
  useEffect(() => {
    updateSearch({
      store,
      country,
      sort: sortBy,
      q: query || "",
      page: String(pageSafe),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, country, sortBy, query, pageSafe])

  /* -------------------- UI -------------------- */
  return (
    <motion.div className="mx-auto max-w-7xl p-4 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Title */}
      <div className="mb-3 md:mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Completed Events</h1>
          <p className="text-sm text-white/60 mt-1">
            {filtered.length} result{filtered.length === 1 ? "" : "s"} · Page {pageSafe} of {totalPages}
          </p>
        </div>
      </div>

      {/* Full-width search on top */}
      <div className="mb-4">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search title, store, city, region, country…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-9 outline-none focus:border-indigo-500/50"
          />
          <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        </div>
      </div>

      {/* Minimal filter row: Store, Country, Sort + Reset */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
        <Field label="Store">
          <Select<RSOption, false>
            options={toOptions(stores)}
            value={{ label: store, value: store }}
            onChange={(opt) => {
              setStore(opt?.value || "All")
              setPage(1)
            }}
            theme={selectTheme}
            styles={selectStyles}
          />
        </Field>

        <Field label="Country">
          <Select<RSOption, false>
            options={toOptions(countries)}
            value={{ label: country, value: country }}
            onChange={(opt) => {
              setCountry(opt?.value || "All")
              setPage(1)
            }}
            theme={selectTheme}
            styles={selectStyles}
          />
        </Field>

        <Field label="Sort by">
          <Select<RSOption, false>
            options={toOptions(["Newest", "Oldest", "Most Players"])}
            value={{ label: sortBy, value: sortBy }}
            onChange={(opt) => setSortBy((opt?.value as SortBy) || "Newest")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </Field>

        <button
          className="h-[38px] rounded-xl border border-white/10 bg-white/5 px-3 text-sm hover:bg-white/10"
          onClick={() => {
            setStore("All")
            setCountry("All")
            setSortBy("Newest")
            setQuery("")
            setPage(1)
            updateSearch({
              store: "All",
              country: "All",
              sort: "Newest",
              q: "",
              page: "1",
            })
          }}
        >
          Reset filters
        </button>
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
              const attendees = getAttendeeCount(e)
              const top1 = e.topCut?.[0]?.name
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
                          {fmtDate(e.endTime)}
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

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                      {typeof attendees === "number" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                          <Users className="h-3.5 w-3.5" /> {attendees} players attended
                        </span>
                      )}
                      {top1 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                          <Trophy className="h-3.5 w-3.5" /> Top: {top1}
                        </span>
                      )}
                    </div>

                    {/* Top 4 only */}
                    {e.topCut?.length ? (
                      <div className="mt-3">
                        <div className="text-xs uppercase tracking-wide text-white/50 mb-1.5">
                          Top cut (first 4)
                        </div>
                        <ul className="space-y-1.5">
                          {e.topCut.slice(0, 4).map((p, i) => (
                            <li
                              key={p.name + i}
                              className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5"
                            >
                              <span className="truncate text-sm">{p.name}</span>
                              <span className="text-xs text-white/50">
                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏁"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
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

/* -------- small label helper -------- */
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/60">{label}</div>
      {children}
    </label>
  )
}
