import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Crown, Medal, Trophy, Users, Search, ChevronDown, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

// --- API base (same helper pattern you use elsewhere) ---
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

type PlayerRow = {
  slug: string
  username?: string
  displayName?: string
  avatarDataUrl?: string
  firsts?: number
  seconds?: number
  thirds?: number
  topCutCount?: number
  tournamentsCount?: number // fallback if provided by API
  tournamentsPlayed?: Array<any> // for local length fallback
}

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
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [sortKey, setSortKey] = useState<"total" | "firsts" | "seconds" | "thirds" | "topcuts">("total")

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)

    // Try dedicated endpoint if you add it (below). Fallback to /api/users if not found.
    const tryFetch = async () => {
      // 1) preferred: pre-aggregated leaderboard from server
      const res1 = await fetch(api("/api/users/leaderboard?limit=200")).catch(() => null)
      if (res1 && res1.ok) {
        const data = await res1.json()
        if (live) setPlayers(data)
        return
      }

      // 2) fallback: fetch all users and compute totals client-side
      const res2 = await fetch(api("/api/users")).catch(() => null)
      if (!res2 || !res2.ok) throw new Error("Failed to fetch users")
      const all = (await res2.json()) as PlayerRow[]
      if (live) setPlayers(all)
    }

    tryFetch()
      .catch((e) => live && setError(e.message || "Failed to load leaderboard"))
      .finally(() => live && setLoading(false))

    return () => {
      live = false
    }
  }, [])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    // derive totals if server didn’t send them
    const normalized = players.map((p) => {
      const total =
        p.tournamentsCount ??
        (Array.isArray(p.tournamentsPlayed) ? p.tournamentsPlayed.length : 0) ??
        (Number(p.firsts || 0) + Number(p.seconds || 0) + Number(p.thirds || 0) + Number(p.topCutCount || 0))
      return {
        ...p,
        _total: total,
        _name: (p.username && p.username.trim()) || p.displayName || p.slug,
      }
    })

    const filtered = needle
      ? normalized.filter((p) => p._name.toLowerCase().includes(needle))
      : normalized

    const sorter = (a: any, b: any) => {
      if (sortKey === "firsts") return (b.firsts || 0) - (a.firsts || 0) || b._total - a._total
      if (sortKey === "seconds") return (b.seconds || 0) - (a.seconds || 0) || b._total - a._total
      if (sortKey === "thirds") return (b.thirds || 0) - (a.thirds || 0) || b._total - a._total
      if (sortKey === "topcuts") return (b.topCutCount || 0) - (a.topCutCount || 0) || b._total - a._total
      return b._total - a._total || (b.firsts || 0) - (a.firsts || 0)
    }

    return filtered.sort(sorter)
  }, [players, q, sortKey])

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
            {/* sort */}
            <button
              onClick={() => {
                const order: typeof sortKey[] = ["total", "firsts", "seconds", "thirds", "topcuts"]
                const next = order[(order.indexOf(sortKey) + 1) % order.length]
                setSortKey(next)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 border border-white/10"
              title="Change sort"
            >
              Sort:{" "}
              <span className="font-semibold capitalize">
                {sortKey === "total" ? "Total" : sortKey}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* LIST */}
      <div className="mt-5 space-y-3">
        {loading ? (
          // skeletons
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
          rows.map((p, idx) => <LeaderboardRow key={p.slug || idx} rank={idx + 1} p={p} />)
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({ rank, p }: { rank: number; p: any }) {
  const name = (p.username && p.username.trim()) || p.displayName || p.slug
  const sharePath = `/u/${encodeURIComponent(p.slug)}`
  const total =
    p._total ??
    p.tournamentsCount ??
    (Array.isArray(p.tournamentsPlayed) ? p.tournamentsPlayed.length : 0) ??
    (Number(p.firsts || 0) + Number(p.seconds || 0) + Number(p.thirds || 0) + Number(p.topCutCount || 0))

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
            alt={name}
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
          <Pill tone="gold" icon={<Crown className="h-4 w-4" />} value={p.firsts || 0} label="Champion" />
          <Pill tone="silver" icon={<Medal className="h-4 w-4" />} value={p.seconds || 0} label="Second" />
          <Pill tone="bronze" icon={<Medal className="h-4 w-4" />} value={p.thirds || 0} label="Third" />
          <Pill tone="indigo" icon={<Trophy className="h-4 w-4" />} value={p.topCutCount || 0} label="Top Cuts" />
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
