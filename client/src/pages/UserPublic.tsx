// File: src/pages/UserPublic.tsx
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion } from "framer-motion"
import {
  Share2,
  MapPin,
  Users,
  ArrowLeft,
  Crown,
  Medal,
  Trophy,
  Sparkles,
  CalendarDays,
} from "lucide-react"

// --- API base (no double /api) ---
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

type OwnedParts = {
  blades: string[]
  assistBlades?: string[]
  ratchets: string[]
  bits: string[]
}

type TournamentEntry = {
  storeName: string
  date: string
  totalPlayers: number
  roundWins: number
  roundLosses: number
  placement: string
}

type PublicUser = {
  id: string | number
  username?: string
  displayName: string
  slug: string
  avatarDataUrl?: string
  bio?: string
  homeStore?: string
  ownedParts?: OwnedParts
  // NEW: prefer these top-level arrays provided by Mongo
  blades?: string[]
  assistBlades?: string[]
  ratchets?: string[]
  bits?: string[]
  partsUpdatedAt?: string

  tournamentsPlayed?: TournamentEntry[]
  topCutCount?: number
  firsts?: number
  seconds?: number
  thirds?: number
  stats?: { tournamentsCount?: number }
}

type InvKey = "blades" | "assistBlades" | "ratchets" | "bits"

export default function UserPublic() {
  const { slug } = useParams()
  const [u, setU] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invTab, setInvTab] = useState<InvKey>("blades") // inventory tab

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const url = api(`/api/users/slug/${encodeURIComponent(String(slug || ""))}`)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data) => {
        if (!mounted) return
        setU(data)
      })
      .catch((e) => mounted && setError(e?.message || "Failed to load profile"))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-4 h-64 animate-pulse rounded-3xl bg-white/5" />
      </div>
    )
  }

  if (error || !u) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-red-400">Profile not found.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Go home
        </Link>
      </div>
    )
  }

  // Prefer top-level arrays; fall back to ownedParts if they’re not present.
  const parts: OwnedParts = {
    blades: (u.blades && u.blades.length ? u.blades : u.ownedParts?.blades) || [],
    assistBlades:
      (u.assistBlades && u.assistBlades.length ? u.assistBlades : u.ownedParts?.assistBlades) || [],
    ratchets: (u.ratchets && u.ratchets.length ? u.ratchets : u.ownedParts?.ratchets) || [],
    bits: (u.bits && u.bits.length ? u.bits : u.ownedParts?.bits) || [],
  }

  const shareUrl = `${window.location.origin}/u/${u.slug}`

  const tournaments =
    Array.isArray(u.tournamentsPlayed)
      ? [...u.tournamentsPlayed]
          .filter(Boolean)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : []

  const tournamentsCount = u.stats?.tournamentsCount ?? tournaments.length
  const firsts = u.firsts ?? 0
  const seconds = u.seconds ?? 0
  const thirds = u.thirds ?? 0
  const topCuts = tournaments.filter((t) => t.placement === "Top Cut").length

  // Performance snapshot (right column)
  const totalWins = tournaments.reduce((a, t) => a + (t.roundWins || 0), 0)
  const totalLosses = tournaments.reduce((a, t) => a + (t.roundLosses || 0), 0)
  const totalMatches = totalWins + totalLosses
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0
  const firstEvent = tournaments.length ? tournaments[tournaments.length - 1] : null
  const latestEvent = tournaments[0] || null

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <Helmet>
        <title>{u.displayName} — MetaBeys Profile</title>
        <meta name="description" content={u.bio || `${u.displayName}'s MetaBeys profile`} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:title" content={`${u.displayName} — MetaBeys Profile`} />
        <meta property="og:description" content={u.bio || ""} />
        {u.avatarDataUrl ? <meta property="og:image" content={u.avatarDataUrl} /> : null}
      </Helmet>

      {/* HERO */}
      <motion.div
        className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/15 via-sky-600/10 to-fuchsia-600/10 p-5 md:p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative flex items-start gap-4">
          <img
            src={u.avatarDataUrl || "/default-avatar.png"}
            alt={u.displayName}
            className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover ring-1 ring-white/10"
            draggable={false}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-2xl md:text-3xl font-bold tracking-tight">{u.displayName}</h1>
                {u.username ? (
                  <div className="mt-0.5 text-sm text-white/70 truncate">@{u.username}</div>
                ) : null}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                title="Copy share link"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:text-sm text-white/80">
              {u.homeStore ? (
                <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1">
                  <MapPin className="h-4 w-4" /> {u.homeStore}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1">
                <Users className="h-4 w-4" />
                {tournamentsCount} tournaments
              </span>
            </div>
          </div>
        </div>

        {/* Podium row */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill icon={<Crown className="h-4 w-4" />} label="Champion" value={firsts} tone="gold" />
          <StatPill icon={<Medal className="h-4 w-4" />} label="Second" value={seconds} tone="silver" />
          <StatPill icon={<Medal className="h-4 w-4" />} label="Third" value={thirds} tone="bronze" />
          <StatPill icon={<Trophy className="h-4 w-4" />} label="Top Cuts (Not Top 3)" value={topCuts} tone="indigo" />
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* About */}
          <Card>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> About
            </div>
            {u.bio ? (
              <p className="whitespace-pre-wrap text-white/90">{u.bio}</p>
            ) : (
              <div className="text-sm text-white/70">No bio yet.</div>
            )}
          </Card>

          {/* Recent Results */}
          <Card>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" /> Recent Results
            </div>

            {!tournaments.length ? (
              <div className="text-sm text-white/70">No recorded results yet.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {tournaments.slice(0, 8).map((t, i) => {
                  const eventId = (t as any).eventId ?? (t as any).id

                  const row = (
                    <div className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{t.storeName}</div>
                        <div className="text-xs text-white/70">
                          {safeDate(t.date)} · {t.totalPlayers} players
                        </div>
                      </div>
                      <PlacementBadge placement={t.placement} />
                    </div>
                  )

                  return (
                    <li key={i} className="relative">
                      {eventId ? (
                        <Link
                          to={`/events/${eventId}`}
                          className="block rounded-xl -mx-2 px-2 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {tournaments.length > 8 ? (
              <div className="mt-3 text-xs text-white/60">Showing 8 of {tournaments.length}.</div>
            ) : null}
          </Card>

          {/* BIG INVENTORY SECTION */}
          <InventorySection parts={parts} invTab={invTab} onChangeTab={(k) => setInvTab(k)} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick Facts */}
          <Card>
            <div className="mb-2 text-sm font-semibold">Quick Facts</div>
            <ul className="space-y-2 text-sm">
              <li className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Users className="h-4 w-4" /> {tournamentsCount} tournaments played
              </li>
              {u.homeStore ? (
                <li className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <MapPin className="h-4 w-4" /> Home store: {u.homeStore}
                </li>
              ) : null}
            </ul>
          </Card>

          {/* Performance Snapshot */}
          <Card>
            <div className="mb-2 text-sm font-semibold">Performance Snapshot</div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Matches" value={totalMatches} />
              <MiniStat label="Win rate" valueStr={`${winRate}%`} />
              <MiniStat label="Wins" value={totalWins} />
              <MiniStat label="Losses" value={totalLosses} />
            </div>
            <div className="mt-3 text-xs text-white/60">
              {firstEvent ? <>First: {safeDate(firstEvent.date)}</> : "First: —"}
              {" · "}
              {latestEvent ? <>Latest: {safeDate(latestEvent.date)}</> : "Latest: —"}
            </div>
          </Card>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}

/* ---------- UI bits ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "gold" | "silver" | "bronze" | "indigo"
}) {
  const toneMap = {
    gold: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
    silver: "border-slate-300/30 bg-slate-300/10 text-slate-200",
    bronze: "border-amber-600/30 bg-amber-600/10 text-amber-200",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  } as const
  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneMap[tone]}`}>
      <div className="text-xs uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value ?? 0}</div>
    </div>
  )
}

function MiniStat({ label, value, valueStr }: { label: string; value?: number; valueStr?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{valueStr ?? value ?? 0}</div>
    </div>
  )
}

function PlacementBadge({ placement }: { placement: string }) {
  const tone =
    placement === "First Place"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : placement === "Second Place"
      ? "bg-slate-300/15 text-slate-200 border-slate-300/30"
      : placement === "Third Place"
      ? "bg-amber-600/15 text-amber-200 border-amber-600/30"
      : "bg-indigo-500/15 text-indigo-200 border-indigo-500/30"
  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {placement}
    </span>
  )
}

function safeDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/* ----- Big Inventory Section ----- */
function InventorySection({
  parts,
  invTab,
  onChangeTab,
}: {
  parts: OwnedParts
  invTab: InvKey
  onChangeTab: (k: InvKey) => void
}) {
  const tabs: { key: InvKey; label: string; count: number }[] = [
    { key: "blades", label: "Blades", count: parts.blades.length },
    { key: "assistBlades", label: "Assist Blades", count: parts.assistBlades?.length || 0 },
    { key: "ratchets", label: "Ratchets", count: parts.ratchets.length },
    { key: "bits", label: "Bits", count: parts.bits.length },
  ]

  const items =
    invTab === "blades"
      ? parts.blades
      : invTab === "assistBlades"
      ? parts.assistBlades || []
      : invTab === "ratchets"
      ? parts.ratchets
      : parts.bits

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = invTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onChangeTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition ${
                active ? "bg-indigo-600/90 text-white" : "border border-white/10 bg-white/5 hover:bg-white/10"
              }`}
              aria-pressed={active}
            >
              {t.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{t.count}</span>
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-white/70">
          No {tabs.find((t) => t.key === invTab)?.label.toLowerCase()} listed yet.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {items.map((x, i) => (
            <li key={`${invTab}-${i}`} className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm">
              {x}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
