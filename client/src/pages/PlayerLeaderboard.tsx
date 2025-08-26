import { useEffect, useState, useDeferredValue } from "react"
import { motion } from "framer-motion"
import { Crown, Medal, Trophy, Users, Search, ChevronDown, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

// --- API base (same helper pattern you use elsewhere) ---
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

type ServerRow = {
  slug: string
  username?: string
  displayName?: string
  avatarDataUrl?: string
  _firsts: number
  _seconds: number
  _thirds: number
  _topcutsOnly: number
  _results: number
  _name?: string
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

  // server-driven data
  const [rows, setRows] = useState<ServerRow[]>([])
  const [total, setTotal] = useState(0)

  // ui state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const deferredQ = useDeferredValue(q) // smoother typing, fewer refetches
  const [sortKey, setSortKey] = useState<"total" | "firsts" | "seconds" | "thirds" | "topcuts">("total")
  const [page, setPage] = useState(1)

  // fetch current page from server
  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort: sortKey,
    })
    if (deferredQ.trim()) params.set("q", deferredQ.trim())

    // NOTE: change to api("/users/leaderboard") if you mounted at /users
    fetch(api("/api/users/leaderboard") + "?" + params.toString(), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((payload) => {
        if (!live) return
        setRows(Array.isArray(payload?.rows) ? payload.rows : [])
        setTotal(Number(payload?.total || 0))
      })
      .catch((e) => {
        if (!live || e.name === "AbortError") return
        setError(e.message || "Failed to load leaderboard")
      })
      .finally(() => {
        if (live) setLoading(false)
      })

    return () => {
      live = false
      controller.abort()
    }
  }, [page, sortKey, deferredQ])

  // reset to first page on sort/search change
  useEffect(() => { setPage(1) }, [sortKey, deferredQ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageRows = rows // server already returns a single page

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
        ) : total === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            No players found.
          </div>
        ) : (
          <>
            {pageRows.map((p, idx) => (
              <LeaderboardRow
                key={p.slug || idx}
                rank={(page - 1) * PAGE_SIZE + idx + 1}  // global rank number
                p={p}
              />
            ))}

            {/* Pagination footer */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-white/60">
                Page {page} of {totalPages} · Showing {Math.min(total, page * PAGE_SIZE)} of {total} players
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({ rank, p }: { rank: number; p: ServerRow }) {
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
            loading="lazy"
            width={56}
            height={56}
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
    <div className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 ${pillTone[tone]}`}>
      {icon}
      <span className="text-xs md:text-sm">{label}</span>
      <span className="ml-1 text-sm md:text-base font-semibold">{value}</span>
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
  // Build compact page list: 1 … (p-1) p (p+1) … last
  const pages: (number | "...")[] = []
  const push = (v: number | "...") => pages.push(v)
  const clamp = (n: number) => Math.max(1, Math.min(totalPages, n))

  const addRange = (s: number, e: number) => {
    for (let i = s; i <= e; i++) push(i)
  }

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
