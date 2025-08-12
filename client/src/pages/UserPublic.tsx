// File: src/pages/UserPublic.tsx
import { useEffect, useMemo, useState } from "react"
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
  ChevronRight,
  Search,
  Boxes,
  Zap,
  Swords,
} from "lucide-react"

/* ---------- API base (no double /api) ---------- */
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

/* ---------- Types ---------- */
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
  id?: string
  eventId?: string
}

type PublicUser = {
  id: string | number
  username?: string
  displayName: string
  slug: string
  avatarDataUrl?: string
  bio?: string
  homeStore?: string

  // legacy container
  ownedParts?: OwnedParts

  // top-level (future-proof)
  blades?: string[]
  assistBlades?: string[]
  ratchets?: string[]
  bits?: string[]
  partsUpdatedAt?: string | null

  tournamentsPlayed?: TournamentEntry[]
  firsts?: number
  seconds?: number
  thirds?: number
  topCutCount?: number
  stats?: { tournamentsCount?: number }
}

/* ---------- Page ---------- */
export default function UserPublic() {
  const { slug } = useParams()
  const [u, setU] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [invSearch, setInvSearch] = useState("")
  const [invTab, setInvTab] = useState<InvKey>("blades")

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const url = api(`/api/users/slug/${encodeURIComponent(String(slug || ""))}`)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data) => mounted && setU(data))
      .catch((e) => mounted && setError(e?.message || "Failed to load profile"))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) return <Skeleton />

  if (error || !u) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-red-400">Profile not found.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/u/${u.slug}`

  // normalize parts (handles legacy ownedParts OR top-level arrays)
  const parts: OwnedParts = {
    blades: u.ownedParts?.blades || u.blades || [],
    assistBlades: u.ownedParts?.assistBlades || u.assistBlades || [],
    ratchets: u.ownedParts?.ratchets || u.ratchets || [],
    bits: u.ownedParts?.bits || u.bits || [],
  }

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
  const topCuts = (u.topCutCount ?? tournaments.filter((t) => t.placement === "Top Cut").length) || 0

  // Perf snapshot
  const totalWins = useMemo(() => tournaments.reduce((a, t) => a + (t.roundWins || 0), 0), [tournaments])
  const totalLosses = useMemo(() => tournaments.reduce((a, t) => a + (t.roundLosses || 0), 0), [tournaments])
  const totalMatches = totalWins + totalLosses
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0
  const firstEvent = tournaments.length ? tournaments[tournaments.length - 1] : null
  const latestEvent = tournaments[0] || null

  // inventory search filter
  const filterItems = (arr: string[]) =>
    arr.filter((x) => x.toLowerCase().includes(invSearch.trim().toLowerCase()))

  const tabs: TabMeta[] = [
    { key: "blades", label: "Blades", count: parts.blades.length, icon: <Swords className="h-4 w-4" /> },
    { key: "assistBlades", label: "Assist Blades", count: parts.assistBlades?.length || 0, icon: <Zap className="h-4 w-4" /> },
    { key: "ratchets", label: "Ratchets", count: parts.ratchets.length, icon: <Boxes className="h-4 w-4" /> },
    { key: "bits", label: "Bits", count: parts.bits.length, icon: <Sparkles className="h-4 w-4" /> },
  ]

  const invItems =
    invTab === "blades"
      ? filterItems(parts.blades)
      : invTab === "assistBlades"
      ? filterItems(parts.assistBlades || [])
      : invTab === "ratchets"
      ? filterItems(parts.ratchets)
      : filterItems(parts.bits)

  return (
    <div className="mx-auto max-w-6xl p-3 md:p-6">
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-700/25 via-fuchsia-700/20 to-cyan-700/20 p-0"
      >
        {/* soft backdrop with avatar */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 blur-2xl"
          style={{
            backgroundImage: `url(${u.avatarDataUrl || "/default-avatar.png"})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(1.2) blur(30px)",
          }}
        />
        <div className="relative p-5 md:p-6">
          <div className="flex items-start gap-4">
            <img
              src={u.avatarDataUrl || "/default-avatar.png"}
              alt={u.displayName}
              className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
              draggable={false}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-2xl md:text-3xl font-extrabold tracking-tight">{u.displayName}</h1>
                  {u.username ? (
                    <div className="mt-0.5 text-sm text-white/80 truncate">@{u.username}</div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                    {u.homeStore ? (
                      <Pill>
                        <MapPin className="h-4 w-4" />
                        {u.homeStore}
                      </Pill>
                    ) : null}
                    <Pill>
                      <Users className="h-4 w-4" />
                      {tournamentsCount} tournaments
                    </Pill>
                    {u.partsUpdatedAt ? (
                      <Pill title="Last inventory update">
                        <Boxes className="h-4 w-4" />
                        {timeAgo(u.partsUpdatedAt)}
                      </Pill>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition"
                  title="Copy share link"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>

              {/* Podium stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile tone="gold" icon={<Crown className="h-4 w-4" />} label="Champion" value={firsts} />
                <StatTile tone="silver" icon={<Medal className="h-4 w-4" />} label="Second" value={seconds} />
                <StatTile tone="bronze" icon={<Medal className="h-4 w-4" />} label="Third" value={thirds} />
                <StatTile tone="indigo" icon={<Trophy className="h-4 w-4" />} label="Top Cuts (Not Top 3)" value={topCuts} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left (About + Results + Inventory) */}
        <div className="xl:col-span-2 space-y-4">
          {/* About */}
          <Card>
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="About" />
            {u.bio ? (
              <p className="whitespace-pre-wrap text-white/95 leading-relaxed">{u.bio}</p>
            ) : (
              <p className="text-white/70 text-sm">No bio yet.</p>
            )}
          </Card>

          {/* Recent Results */}
          <Card>
            <SectionHeader icon={<CalendarDays className="h-4 w-4" />} title="Recent Results" />
            {!tournaments.length ? (
              <div className="text-sm text-white/70">No recorded results yet.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {tournaments.slice(0, 10).map((t, i) => {
                  const eventId = (t as any).eventId ?? (t as any).id
                  const row = (
                    <div className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="font-medium">{t.storeName}</div>
                        <div className="text-xs text-white/70">
                          {safeDate(t.date)} · {t.totalPlayers} players · {t.roundWins || 0}-{t.roundLosses || 0}
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
            {tournaments.length > 10 ? (
              <div className="mt-3 text-xs text-white/60">Showing 10 of {tournaments.length}.</div>
            ) : null}
          </Card>

          {/* Inventory */}
          <Card>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader icon={<Boxes className="h-4 w-4" />} title="Inventory" />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-white/50" />
                  <input
                    className="pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none text-sm focus:border-indigo-500/50"
                    placeholder="Search parts…"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-3 flex flex-wrap gap-2">
              {tabs.map((t) => {
                const active = invTab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setInvTab(t.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition ${
                      active ? "bg-indigo-600/90 text-white" : "border border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    aria-pressed={active}
                  >
                    {t.icon}
                    {t.label}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{t.count}</span>
                  </button>
                )
              })}
            </div>

            {/* Items */}
            {invItems.length === 0 ? (
              <div className="text-sm text-white/70">No {tabs.find((t) => t.key === invTab)?.label.toLowerCase()} listed.</div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {invItems.map((x, i) => (
                  <li
                    key={`${invTab}-${i}`}
                    className="group rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{x}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right (Quick facts + Performance) */}
        <div className="space-y-4">
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

/* ---------- Small components ---------- */
function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="h-36 animate-pulse rounded-3xl bg-white/5" />
      <div className="mt-4 h-64 animate-pulse rounded-3xl bg-white/5" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>
}

function Pill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1"
    >
      {children}
    </span>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </div>
  )
}

function StatTile({
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
      <div className="text-[11px] uppercase tracking-wide flex items-center gap-1.5">
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

/* ---------- helpers ---------- */
type InvKey = "blades" | "assistBlades" | "ratchets" | "bits"
type TabMeta = { key: InvKey; label: string; count: number; icon: React.ReactNode }

function safeDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—"
  const now = Date.now()
  const ts = new Date(iso).getTime()
  if (isNaN(ts)) return "—"
  const diff = Math.max(0, now - ts)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < hr) return `${Math.round(diff / min)}m ago`
  if (diff < day) return `${Math.round(diff / hr)}h ago`
  return `${Math.round(diff / day)}d ago`
}
