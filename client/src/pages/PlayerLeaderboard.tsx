import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Crown, Medal, Trophy, Users, Search, ChevronDown, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

// --- API base (same helper you already use) ---
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

type PlayerRow = {
  slug: string
  username?: string
  displayName?: string
  avatarDataUrl?: string
  _firsts?: number
  _seconds?: number
  _thirds?: number
  _topcutsOnly?: number
  _results?: number
  _name?: string
  // legacy fields if we ever fall back to /api/users
  firsts?: number
  seconds?: number
  thirds?: number
  topCutCount?: number
  tournamentsPlayed?: Array<{ placement?: string }>
}

type LeaderboardPayload = {
  ok?: boolean
  page: number
  pageSize: number
  total: number
  sort?: string
  rows: PlayerRow[]
}

const SORT_OPTIONS: { label: string; value: "total" | "firsts" | "seconds" | "thirds" | "topcuts" }[] = [
  { label: "Total",  value: "total" },
  { label: "Firsts", value: "firsts" },
  { label: "Seconds", value: "seconds" },
  { label: "Thirds", value: "thirds" },
  { label: "Top Cuts", value: "topcuts" },
]

// UI helpers
const pillTone = {
  gold: "border-yellow-400/40 text-yellow-200 bg-yellow-400/10",
  silver: "border-slate-300/40 text-slate-200 bg-slate-300/10",
  bronze: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  indigo: "border-indigo-500/40 text-indigo-200 bg-indigo-500/10",
} as const

const shimmer =
  "animate-pulse rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]"

export default function PlayerLeaderboard() {
  const PAGE_SIZE = 20

  // IMPORTANT: payload is an object { rows, total } — not an array
  const [payload, setPayload] = useState<LeaderboardPayload>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    rows: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [sortKey, setSortKey] =
    useState<"total" | "firsts" | "seconds" | "thirds" | "topcuts">("total")
  const [page, setPage] = useState(1)

  // fetch whenever page/sort/search change
  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)

    const run = async () => {
      // 1) primary — your server route is /users/leaderboard (no /api prefix)
      try {
        const url = api(
          `/users/leaderboard?page=${page}&pageSize=${PAGE_SIZE}&sort=${sortKey}&q=${encodeURIComponent(q)}`
        )
        const r1 = await fetch(url)
        if (r1.ok) {
          const data = (await r1.json()) as LeaderboardPayload
          if (live && data && Array.isArray(data.rows)) {
            setPayload(data)
            return
          }
        }
      } catch {
        // move to fallback
      }

      // 2) fallback — legacy /api/users (client-side derive; keeps avatars as-is)
      try {
        const r2 = await fetch(api("/api/users"))
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`)
        const all = (await r2.json()) as PlayerRow[]
        if (!live) return

        // derive minimal totals for UI if server didn’t provide them
        const rows = all.map((p) => {
          if (Array.isArray(p.tournamentsPlayed) && p.tournamentsPlayed.length) {
            let f = 0, s = 0, t = 0, tc = 0
            for (const tp of p.tournamentsPlayed) {
              const plc = tp?.placement
              if (plc === "First Place") f++
              else if (plc === "Second Place") s++
              else if (plc === "Third Place") t++
              else if (plc === "Top Cut") tc++
            }
            return {
              ...p,
              _firsts: f, _seconds: s, _thirds: t,
              _topcutsOnly: tc,
              _results: f + s + t + tc,
              _name: (p.username && p.username.trim()) || p.displayName || p.slug,
            }
          } else {
            const f = Number(p.firsts || 0)
            const s = Number(p.seconds || 0)
            const t = Number(p.thirds || 0)
            const tcOnly = Math.max(0, Number(p.topCutCount || 0) - (f + s + t))
            return {
              ...p,
              _firsts: f, _seconds: s, _thirds: t,
              _topcutsOnly: tcOnly,
              _results: f + s + t + tcOnly,
              _name: (p.username && p.username.trim()) || p.displayName || p.slug,
            }
          }
        })

        setPayload({
          page,
          pageSize: PAGE_SIZE,
          total: rows.length,
          sort: sortKey,
          rows,
        })
      } catch (e: any) {
        if (live) setError(e?.message || "Failed to load leaderboard")
      }
    }

    run()
      .catch((e) => live && setError(e?.message || "Failed to load leaderboard"))
      .finally(() => live && setLoading(false))

    return () => { live = false }
  }, [page, sortKey, q])

  // Reset to first page when filters/sorts change
  useEffect(() => { setPage(1) }, [q, sortKey])

  // cheap client-side name filter (server already filters via ?q=)
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all = Array.isArray(payload.rows) ? payload.rows : []
    return needle
      ? all.filter((p) => (p._name || p.username || p.displayName || p.slug || "")
          .toLowerCase().includes(needle))
      : all
  }, [payload, q])

  const totalPages = Math.max(1, Math.ceil((payload.total || rows.length) / payload.pageSize || 1))
  const pageRows = rows // already paginated by server (fallback mimics)

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      {/* HERO */}
      <motion.div
        className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/15 via-sky-600/10 to-fuchsia-600/10 p-5 md:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-300" />
              Player Leaderboard
            </h1>
            <p className="mt-1 text-white/80">
              Ranked by total tournament results (Top Cut + Podium).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search player…"
                className="w-full sm:w-64 rounded-xl bg-white/10 pl-9 pr-3 py-2 outline-none border border-white/10 focus:border-indigo-400/60"
              />
            </div>
            {/* sort (dropdown) */}
            <div className="relative">
              <label className="sr-only" htmlFor="sortBy">Sort</label>
              <select
                id="sortBy"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                className="appearance-none w-full sm:w-44 rounded-xl bg-white/10 px-3 py-2 pr-9 text-sm outline-none border border-white/10 focus:border-indigo-400/60"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/60" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* LIST */}
      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-[86px] ${shimmer}`} />
          ))
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Failed to load leaderboard.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            No players found.
          </div>
        ) : (
          <>
            {pageRows.map((p, idx) => (
              <LeaderboardRow
                key={p.slug || idx}
                rank={(page - 1) * payload.pageSize + idx + 1}
                p={p}
              />
            ))}

            {/* Pagination footer */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-white/60">
                Page {page} of {totalPages} · Showing {Math.min(payload.total || rows.length, page * payload.pageSize)} of {payload.total || rows.length} players
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({ rank, p }: { rank: number; p: PlayerRow }) {
  const name = (p.username && p.username.trim()) || p.displayName || p.slug
  const sharePath = p.slug ? `/u/${encodeURIComponent(p.slug)}` : "#"

  const total = p._results ?? 0
  const firsts = p._firsts ?? 0
  const seconds = p._seconds ?? 0
  const thirds = p._thirds ?? 0
  const topCutsOnly = p._topcutsOnly ?? 0

  const rankTone =
    rank === 1
      ? "from-yellow-400/20 to-amber-500/10"
      : rank === 2
      ? "from-slate-300/20 to-slate-500/10"
      : rank === 3
      ? "from-amber-500/20 to-amber-700/10"
      : "from-indigo-400/10 to-sky-500/5"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${rankTone}`}
    >
      <div className="flex items-center gap-3 p-3 md:p-4">
        {/* Rank badge */}
        <div className="shrink-0 grid place-items-center h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/10 border border-white/10 font-extrabold">
          {rank}
        </div>

        {/* Avatar + name */}
        <Link to={sharePath} className="flex items-center gap-3 min-w-0 group">
          <img
            src={p.avatarDataUrl || "/default-avatar.png"}
            alt={p.avatarDataUrl ? name : ""}
            className="h-12 w-12 md:h-14 md:w-14 rounded-xl object-cover ring-1 ring-white/10 group-hover:ring-indigo-400/40 transition"
            draggable={false}
          />

          <div className="min-w-0">
            <div className="truncate text-lg md:text-xl font-semibold group-hover:text-indigo-200">
              {name}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Users className="h-3.5 w-3.5" />
              {total} results
            </div>
          </div>
        </Link>

        {/* Right-side stat pills */}
        <div className="ml-auto grid grid-cols-2 md:flex md:flex-row gap-2">
          <Pill tone="gold" icon={<Crown className="h-4 w-4" />} value={firsts} label="Champion" />
          <Pill tone="silver" icon={<Medal className="h-4 w-4" />} value={seconds} label="Second" />
          <Pill tone="bronze" icon={<Medal className="h-4 w-4" />} value={thirds} label="Third" />
          <Pill tone="indigo" icon={<Trophy className="h-4 w-4" />} value={topCutsOnly} label="Top Cuts" />
        </div>
      </div>
    </motion.div>
  )
}

function Pill({
  tone,
  icon,
  value,
  label,
}: {
  tone: keyof typeof pillTone
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1
                  whitespace-nowrap leading-none ${pillTone[tone]}`}
    >
      <span className="shrink-0 inline-flex items-center justify-center">
        <span className="h-4 w-4 inline-flex items-center justify-center">{icon}</span>
      </span>

      <span className="text-[11px] md:text-sm align-middle">{label}</span>

      <span
        className="ml-1 shrink-0 inline-flex items-center justify-center
                   rounded-md bg-black/10 px-1.5 py-0.5
                   text-[11px] md:text-sm font-semibold tabular-nums leading-none"
      >
        {value}
      </span>
    </div>
  )
}

/* ---------- Pagination ---------- */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  const pages: (number | "...")[] = []
  const push = (v: number | "...") => pages.push(v)
  const clamp = (n: number) => Math.max(1, Math.min(totalPages, n))
  const addRange = (s: number, e: number) => { for (let i = s; i <= e; i++) push(i) }

  push(1)
  if (page > 3) push("...")
  addRange(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1))
  if (page < totalPages - 2) push("...")
  if (totalPages > 1) push(totalPages)

  const btnBase =
    "h-9 min-w-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-40 disabled:pointer-events-none"

  return (
    <div className="flex items-center gap-2">
      <button className={btnBase} disabled={page === 1} onClick={() => onChange(clamp(page - 1))}>
        Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-2 text-white/50 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btnBase} ${p === page ? "bg-indigo-600/90 hover:bg-indigo-500 border-indigo-500/50 text-white" : ""}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button className={btnBase} disabled={page === totalPages} onClick={() => onChange(clamp(page + 1))}>
        Next
      </button>
    </div>
  )
}
