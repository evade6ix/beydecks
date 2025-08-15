import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useSearchParams, } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import {
  BarChart3,
  Filter,
  Search,
  Download,
  Share2,
  RefreshCw,
  ChevronDown,
  Check,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

// ---------- Types ----------
type Timeframe = "all" | "year" | "month" | "week"
type PartKind = "blade" | "assist" | "ratchet" | "bit" | "combo"

// for modal focus (exclude "combo")
type FocusKind = Exclude<PartKind, "combo">

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
}
interface Player { name: string; combos: Combo[] }
interface EventItem {
  id: number | string
  title: string
  store?: string
  startTime?: string
  endTime?: string
  date?: string
  city?: string
  region?: string
  country?: string
  topCut?: Player[]
}

// ---------- Utils ----------
const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ")
const csvEscape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`

// Title-case but keep tokens like “3-60” readable
function titleCase(s: string) {
  return (s || "")
    .split(" ")
    .map(word =>
      word.includes("-")
        ? word.split("-").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join("-")
        : word ? word[0].toUpperCase() + word.slice(1) : word
    )
    .join(" ")
}

function fmtPct(n: number) {
  if (!isFinite(n)) return "0%"
  return (n * 100).toFixed(n < 0.01 ? 2 : n < 0.1 ? 1 : 0) + "%"
}

function windowStartFor(tf: Timeframe, now = new Date()) {
  if (tf === "year") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  if (tf === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  if (tf === "week") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  return new Date(0)
}

// ---------- Page ----------
export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams()

  // deep-link filters for combo view
  const bladeFilter = searchParams.get("blade") || ""
  const assistFilter = searchParams.get("assist") || ""
  const ratchetFilter = searchParams.get("ratchet") || ""
  const bitFilter = searchParams.get("bit") || ""

  const urlKind = (searchParams.get("kind") as PartKind) || "blade"
  const urlTf = (searchParams.get("tf") as Timeframe) || "all"

  // If any part filter is present, force combo view
  const initialKind: PartKind =
    bladeFilter || assistFilter || ratchetFilter || bitFilter ? "combo" : urlKind

  const [kind, setKind] = useState<PartKind>(initialKind)
  const [timeframe, setTimeframe] = useState<Timeframe>(urlTf)
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For share link copying
  const shareBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/events`)
      .then(r => r.json())
      .then((eventData: EventItem[]) => { setEvents(eventData || []); setLoading(false) })
      .catch(() => { setError("Failed to load events"); setLoading(false) })
  }, [])

  // Persist controls in URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set("kind", kind)
    next.set("tf", timeframe)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, timeframe])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [kind, timeframe, query])

  // ---------- Build flat appearances once ----------
  type Appearance = {
    eventId: string | number
    player: string
    blade: { n: string; d: string }
    assist: { n: string; d: string } | null
    ratchet: { n: string; d: string }
    bit: { n: string; d: string }
  }

  const appearances = useMemo<Appearance[]>(() => {
    const now = new Date()
    const start = windowStartFor(timeframe, now)
    const within = (d: Date, s: Date, e?: Date) => (e ? d >= s && d <= e : d >= s)
    const currentEvents = events.filter(e => within(new Date(e.startTime || e.date || 0), start))

    const out: Appearance[] = []
    for (const ev of currentEvents) {
      const evId = ev.id ?? `${ev.title}-${ev.startTime || ev.date || ""}`
      for (const p of ev.topCut || []) {
        for (const c of p.combos || []) {
          const bladeRaw = (c.blade || "").trim()
          const assistRaw = (c.assistBlade || "").trim()
          const ratchetRaw = (c.ratchet || "").trim()
          const bitRaw = (c.bit || "").trim()
          if (!bladeRaw || !ratchetRaw || !bitRaw) continue

          out.push({
            eventId: evId,
            player: norm(p.name || ""),
            blade: { n: norm(bladeRaw), d: titleCase(bladeRaw) },
            assist: assistRaw ? { n: norm(assistRaw), d: titleCase(assistRaw) } : null,
            ratchet: { n: norm(ratchetRaw), d: titleCase(ratchetRaw) },
            bit: { n: norm(bitRaw), d: titleCase(bitRaw) },
          })
        }
      }
    }
    return out
  }, [events, timeframe])

  // ---------- Aggregate per tab ----------
  type Row = {
    key: string
    primary: string
    secondary?: string
    appearances: number
    uniqueEvents: number
    uniquePlayers: number
    share: number
    // combo-only:
    assist?: string // pretty label of assist (one per row, optional)
  }

  const { rows, totalAppearances } = useMemo(() => {
    type Agg = {
      appearances: number
      eventIds: Set<string | number>
      playerNames: Set<string>
      primary: string
      secondary?: string
      assist?: string
    }

    const map = new Map<string, Agg>()
    let curTotal = 0

    function add(
      key: string,
      primary: string,
      secondary: string | undefined,
      eventId: string | number,
      player: string,
      assistPretty?: string
    ) {
      if (!key) return
      const a = map.get(key) || {
        appearances: 0,
        eventIds: new Set<string | number>(),
        playerNames: new Set<string>(),
        primary,
        secondary,
        assist: assistPretty,
      }
      a.appearances += 1
      a.eventIds.add(eventId)
      a.playerNames.add(player)
      map.set(key, a)
      curTotal += 1
    }

    for (const curr of appearances) {
      if (kind === "blade") {
        add(curr.blade.n, curr.blade.d, undefined, curr.eventId, curr.player)
      } else if (kind === "assist") {
        if (curr.assist) add(curr.assist.n, curr.assist.d, undefined, curr.eventId, curr.player)
      } else if (kind === "ratchet") {
        add(curr.ratchet.n, curr.ratchet.d, undefined, curr.eventId, curr.player)
      } else if (kind === "bit") {
        add(curr.bit.n, curr.bit.d, undefined, curr.eventId, curr.player)
      } else {
        // ✅ combo key includes assist (optional) so each assist has its own row
        const k = `${curr.blade.n}|||${curr.ratchet.n}|||${curr.bit.n}|||${curr.assist ? curr.assist.n : ""}`
        add(k, curr.blade.d, `${curr.ratchet.d} • ${curr.bit.d}`, curr.eventId, curr.player, curr.assist?.d)
      }
    }

    const out: Row[] = []
    for (const [k, v] of map.entries()) {
      out.push({
        key: k,
        primary: v.primary,
        secondary: v.secondary,
        appearances: v.appearances,
        uniqueEvents: v.eventIds.size,
        uniquePlayers: v.playerNames.size,
        share: curTotal ? v.appearances / curTotal : 0,
        assist: v.assist,
      })
    }

    out.sort((a, b) => b.appearances - a.appearances || a.primary.localeCompare(b.primary))
    return { rows: out, totalAppearances: curTotal }
  }, [appearances, kind])

  // ---------- Apply optional deep-link filters in combo view ----------
  const rowsWithPartFilter = useMemo(() => {
    if (kind !== "combo" || (!bladeFilter && !assistFilter && !ratchetFilter && !bitFilter)) return rows
    const b = norm(bladeFilter)
    const a = norm(assistFilter)
    const r = norm(ratchetFilter)
    const t = norm(bitFilter)
    return rows.filter(row => {
      const [kb, kr, kt, ka] = row.key.split("|||")
      if (bladeFilter && kb !== b) return false
      if (ratchetFilter && kr !== r) return false
      if (bitFilter && kt !== t) return false
      if (assistFilter && ka !== a) return false
      return true
    })
  }, [rows, kind, bladeFilter, assistFilter, ratchetFilter, bitFilter])

  // ---------- Search (predictive in combo; exact when there's a full match) ----------
  const filteredRows = useMemo(() => {
    const q = norm(query)
    if (!q) return rowsWithPartFilter

    return rowsWithPartFilter.filter(r => {
      if (kind !== "combo") {
        // non-combo tabs keep partial/contains
        const hay = norm(`${r.primary} ${r.secondary || ""} ${r.assist || ""}`)
        return hay.includes(q)
      }

      // r.key in combo: blade|||ratchet|||bit|||assist?
      const parts = r.key.split("|||").map(norm).filter(Boolean)

      // if user has typed an exact full part name -> exact mode
      const exactHit = parts.some(p => p === q)
      if (exactHit) return true

      // otherwise predictive: prefix match on the *full* part names
      const prefixHit = parts.some(p => p.startsWith(q))
      return prefixHit
    })
  }, [rowsWithPartFilter, query, kind])

  // ---------- Pagination ----------
  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / limit))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * limit
  const pageRows = filteredRows.slice(pageStart, pageStart + limit)

  // ---------- CSV export ----------
  function exportCSV() {
    const header = kind === "combo"
      ? ["rank","blade","assist","ratchet • bit","appearances","unique_events","unique_players","share"]
      : ["rank","item","appearances","unique_events","unique_players","share"]
    const lines = [header.join(",")]

    const rowsToExport = filteredRows
    rowsToExport.forEach((r, i) => {
      if (kind === "combo") {
        const line = [
          String(i + 1),
          csvEscape(r.primary),
          csvEscape(r.assist || ""),
          csvEscape(r.secondary || ""),
          String(r.appearances),
          String(r.uniqueEvents),
          String(r.uniquePlayers),
          (r.share * 100).toFixed(2),
        ].join(",")
        lines.push(line)
      } else {
        const line = [
          String(i + 1),
          csvEscape(r.primary),
          String(r.appearances),
          String(r.uniqueEvents),
          String(r.uniquePlayers),
          (r.share * 100).toFixed(2),
        ].join(",")
        lines.push(line)
      }
    })
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `metabeys_${kind}_leaderboard_${timeframe}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyShare() {
    const url = new URL(window.location.href)
    url.searchParams.set("kind", kind)
    url.searchParams.set("tf", timeframe)
    if (bladeFilter) url.searchParams.set("blade", bladeFilter)
    if (assistFilter) url.searchParams.set("assist", assistFilter)
    if (ratchetFilter) url.searchParams.set("ratchet", ratchetFilter)
    if (bitFilter) url.searchParams.set("bit", bitFilter)
    navigator.clipboard.writeText(url.toString()).then(() => {
      if (shareBtnRef.current) {
        shareBtnRef.current.innerText = "Copied!"
        setTimeout(() => { if (shareBtnRef.current) shareBtnRef.current.innerText = "Share" }, 1200)
      }
    }).catch(() => {})
  }

  // ---------- Navigate to same-page combo view from a part ----------
  function goToComboFromPart(fk: FocusKind, displayName: string) {
    const value = norm(displayName)
    const next = new URLSearchParams(searchParams)
    next.set("kind", "combo")
    // clear all part filters first
    next.delete("blade"); next.delete("assist"); next.delete("ratchet"); next.delete("bit")
    // set the one we’re focusing
    if (fk === "blade")  next.set("blade", value)
    if (fk === "assist") next.set("assist", value)
    if (fk === "ratchet")next.set("ratchet", value)
    if (fk === "bit")    next.set("bit", value)
    setKind("combo")      // ensure UI switches tabs immediately
    setPage(1)
    setSearchParams(next, { replace: false })
  }

  return (
    <div className="relative min-h-screen bg-[#0b1020] text-white">
      <Helmet>
        <title>MetaBeys – Leaderboard</title>
        <meta name="description" content="Live usage rankings for blades, assist blades, ratchets, bits and top combos from real tournament top cuts." />
      </Helmet>

      {/* background accent */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(99,102,241,0.2),transparent_70%)]" />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-200">
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold tracking-wide">Meta Leaderboard</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => exportCSV()} className="btn btn-sm btn-ghost gap-2"><Download className="w-4 h-4"/>Export</button>
            <button ref={shareBtnRef} onClick={copyShare} className="btn btn-sm btn-ghost gap-2"><Share2 className="w-4 h-4"/>Share</button>
            <Link to="/home" className="btn btn-sm btn-primary">Back to Home</Link>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">{error}</div>
        </div>
      )}

      {/* Controls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <Segmented
              value={kind}
              onChange={(v) => {
                if (v !== "combo") {
                  const next = new URLSearchParams(searchParams)
                  next.delete("blade"); next.delete("assist"); next.delete("ratchet"); next.delete("bit")
                  setSearchParams(next, { replace: true })
                }
                setKind(v)
              }}
              options={[
                { label: "Blades", value: "blade" },
                { label: "Assist", value: "assist" },
                { label: "Ratchets", value: "ratchet" },
                { label: "Bits", value: "bit" },
                { label: "Combos", value: "combo" },
              ]}
            />
          </div>
          <div className="lg:col-span-4 flex items-center gap-2 justify-between lg:justify-end">
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl pl-2 pr-1 py-1">
                <Filter className="w-4 h-4 text-white/60" />
                <DropdownSelect<Timeframe>
                  value={timeframe}
                  onChange={(v) => { setTimeframe(v); setPage(1) }}
                  options={[
                    { label: "All time", value: "all" },
                    { label: "Past year", value: "year" },
                    { label: "Past month", value: "month" },
                    { label: "Past week", value: "week" },
                  ]}
                />
              </div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl pl-2 pr-1 py-1">
                <span className="text-xs text-white/70">Rows</span>
                <DropdownSelect<number>
                  value={limit}
                  onChange={(n) => { setLimit(n); setPage(1) }}
                  options={[25, 50, 100, 250].map(n => ({ label: String(n), value: n }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${kind === "combo" ? "combo or part" : kind}…`}
              className="input input-sm pl-9 w-full bg-white/5 border-white/10 placeholder-white/50"
            />
          </div>
          <button onClick={() => setQuery("")} className="btn btn-sm btn-ghost"><RefreshCw className="w-4 h-4"/></button>
        </div>

        {/* Hint if combo filtered via URL */}
        {kind === "combo" && (bladeFilter || assistFilter || ratchetFilter || bitFilter) && (
          <div className="mt-3 text-sm text-white/80">
            Showing top combos for
            {bladeFilter && <> <span className="font-semibold">Blade:</span> {titleCase(bladeFilter)}</>}
            {assistFilter && <> · <span className="font-semibold">Assist:</span> {titleCase(assistFilter)}</>}
            {ratchetFilter && <> · <span className="font-semibold">Ratchet:</span> {titleCase(ratchetFilter)}</>}
            {bitFilter && <> · <span className="font-semibold">Bit:</span> {titleCase(bitFilter)}</>}
          </div>
        )}
      </section>

      {/* Summary cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPI label="Items ranked" value={rowsWithPartFilter.length} />
          <KPI label="Top-cut appearances" value={totalAppearances} />
          <KPI label="Showing" value={pageRows.length} suffix={` of ${rowsWithPartFilter.length}`} />
        </div>
      </section>

      {/* Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-white/80">
                  <th className="px-4 py-3 sticky left-0 bg-white/5 backdrop-blur z-10">#</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Appearances</th>
                  <th className="px-4 py-3">Share</th>
                  <th className="px-4 py-3">Unique Events</th>
                  <th className="px-4 py-3">Unique Players</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/70">Loading…</td></tr>
                )}
                {!loading && pageRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/70">No results</td></tr>
                )}
                {!loading && pageRows.map((r, i) => {
                  const clickable = kind !== "combo" // ⚠️ Combos rows are NOT clickable
                  const onClick = clickable ? () => goToComboFromPart(kind as FocusKind, r.primary) : undefined
                  const onKey = clickable ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      goToComboFromPart(kind as FocusKind, r.primary)
                    }
                  } : undefined

                  return (
                    <tr
                      key={r.key}
                      role={clickable ? "link" : undefined}
                      tabIndex={clickable ? 0 : -1}
                      aria-label={clickable ? `Open ${kind} "${r.primary}" in combos` : undefined}
                      onClick={onClick}
                      onKeyDown={onKey}
                      className={
                        "border-t border-white/10 transition outline-none " +
                        (clickable
                          ? "cursor-pointer hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                          : "cursor-default")
                      }
                      title={clickable ? "Show combos using this item" : undefined}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-[#0b1020] z-10">{pageStart + i + 1}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="text-sm md:text-base font-semibold text-white">{r.primary}</div>

                        {kind === "combo" && (
                          <>
                            {r.secondary && (
                              <div className="text-[11px] md:text-xs text-white/80 mt-0.5">
                                {r.secondary}
                              </div>
                            )}
                            {r.assist && (
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[10px] md:text-xs font-medium leading-none">
                                  Assist: {r.assist}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold">{r.appearances.toLocaleString()}</td>
                      <td className="px-4 py-3 w-56">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: `${(r.share * 100).toFixed(2)}%` }} />
                          </div>
                          <span className="tabular-nums text-white/80 min-w-[3.5rem] text-right">{fmtPct(r.share)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.uniqueEvents}</td>
                      <td className="px-4 py-3">{r.uniquePlayers}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pager */}
          <div className="flex items-center justify-between px-3 py-3 text-sm text-white/80 border-t border-white/10">
            <div>
              Showing <span className="font-semibold">{pageRows.length}</span> of{" "}
              <span className="font-semibold">{totalItems}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-xs"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Prev
              </button>
              <span>Page {safePage} of {totalPages}</span>
              <button
                className="btn btn-xs"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* =========================
   UI Bits
   ========================= */

function KPI({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-3xl font-extrabold tabular-nums">{value.toLocaleString()}<span className="text-xl align-top">{suffix}</span></div>
      <div className="text-sm text-white/70 mt-1">{label}</div>
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { label: string; value: T; icon?: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-2 transition ${active ? "bg-white/90 text-gray-900" : "text-white/80 hover:bg-white/10"}`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Dark, accessible dropdown (custom, no deps)
function DropdownSelect<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = options.find(o => o.value === value)?.label ?? String(value)

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="px-2 py-1 rounded-lg text-sm inline-flex items-center gap-1 hover:bg-white/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current}
        <ChevronDown className="w-4 h-4 opacity-80" />
      </button>

      {open && (
        <div
          ref={popRef}
          role="listbox"
          className="absolute right-0 mt-1 w-44 rounded-lg border border-white/10 bg-[#0f172a] text-white shadow-xl ring-1 ring-black/5 z-20 p-1"
        >
          {options.map(o => {
            const active = o.value === value
            return (
              <button
                key={String(o.value)}
                role="option"
                aria-selected={active}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-2 py-2 rounded-md text-sm hover:bg-white/10 ${active ? "bg-white/10" : ""}`}
              >
                <span className="inline-flex items-center gap-2">
                  {active && <Check className="w-4 h-4" />}
                  {o.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
