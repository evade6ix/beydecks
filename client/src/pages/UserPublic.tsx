// File: src/pages/UserPublic.tsx
import React, { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
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
  Flame,
  BadgeCheck,
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
      .then((data) => {
        if (!mounted) return
        setU(data)
      })
      .catch((e) => mounted && setError(String(e?.message || "Failed to load profile")))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) return <Skeleton />

  if (error || !u) {
    return (
      <div className="mx-auto max-w-7xl p-6">
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

  const tournaments: TournamentEntry[] = Array.isArray(u.tournamentsPlayed)
    ? [...u.tournamentsPlayed]
        .filter((x) => x && typeof x === "object")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : []

  const tournamentsCount = (u.stats && u.stats.tournamentsCount) || tournaments.length
  const firsts = Number(u.firsts || 0)
  const seconds = Number(u.seconds || 0)
  const thirds = Number(u.thirds || 0)
  const topCuts =
    Number(u.topCutCount || 0) || tournaments.filter((t) => String(t.placement) === "Top Cut").length

  // Perf snapshot
  const totalWins = useMemo(
    () => tournaments.reduce((a, t) => a + Number(t.roundWins || 0), 0),
    [tournaments]
  )
  const totalLosses = useMemo(
    () => tournaments.reduce((a, t) => a + Number(t.roundLosses || 0), 0),
    [tournaments]
  )
  const totalMatches = totalWins + totalLosses
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0
  const firstEvent = tournaments.length ? tournaments[tournaments.length - 1] : null
  const latestEvent = tournaments[0] || null

  // inventory search filter
  const filterItems = (arr: string[]) => {
    const q = invSearch.trim().toLowerCase()
    return q ? arr.filter((x) => String(x).toLowerCase().includes(q)) : arr
  }

  const tabs: TabMeta[] = [
    { key: "blades", label: "Blades", count: parts.blades.length, icon: <Swords className="h-4 w-4" /> },
    {
      key: "assistBlades",
      label: "Assist Blades",
      count: (parts.assistBlades && parts.assistBlades.length) || 0,
      icon: <Zap className="h-4 w-4" />,
    },
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
    <div className="relative">
      {/* page bg accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-[30vh] -left-[10vw] h-[70vh] w-[70vh] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-[25vh] -right-[10vw] h-[60vh] w-[60vh] rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      {/* HERO */}
      <div className="mx-auto max-w-7xl px-3 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-slate-900/20">
          {/* aurora */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[120%] w-[140%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(99,102,241,.25),transparent)] blur-2xl" />
            <div className="absolute right-[-20%] bottom-[-20%] h-[120%] w-[70%] bg-[radial-gradient(closest-side,rgba(236,72,153,.22),transparent)] blur-2xl" />
          </div>

          <div className="relative p-5 md:p-7">
            <div className="flex items-start gap-5">
              {/* Avatar with ring */}
              <div className="relative">
                <img
                  src={u.avatarDataUrl || "/default-avatar.png"}
                  alt={u.displayName}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover ring-1 ring-white/20 shadow-2xl"
                  draggable={false}
                />
                <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/10 blur" />
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
                      {u.displayName}
                      <BadgeCheck className="h-5 w-5 text-indigo-300/80" />
                    </h1>
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

                {/* Stat rail */}
                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile tone="gold" icon={<Crown className="h-4 w-4" />} label="Champion" value={firsts} />
                  <StatTile tone="silver" icon={<Medal className="h-4 w-4" />} label="Second" value={seconds} />
                  <StatTile tone="bronze" icon={<Medal className="h-4 w-4" />} label="Third" value={thirds} />
                  <StatTile
                    tone="indigo"
                    icon={<Trophy className="h-4 w-4" />}
                    label="Top Cuts (Not Top 3)"
                    value={topCuts}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="mt-6 grid grid-cols-1 2xl:grid-cols-3 gap-4">
          {/* LEFT: About + Results + Inventory */}
          <div className="2xl:col-span-2 space-y-4">
            {/* About Card */}
            <GlassCard>
              <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="About" />
              {u.bio ? (
                <p className="whitespace-pre-wrap text-white/95 leading-relaxed">{u.bio}</p>
              ) : (
                <p className="text-white/70 text-sm">No bio yet.</p>
              )}
            </GlassCard>

            {/* Results Timeline */}
            <GlassCard>
              <SectionHeader icon={<CalendarDays className="h-4 w-4" />} title="Recent Results" />
              {!tournaments.length ? (
                <div className="text-sm text-white/70">No recorded results yet.</div>
              ) : (
                <ul className="relative">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
                  {tournaments.slice(0, 12).map((t, i) => {
                    const eventId = (t as any).eventId ?? (t as any).id
                    const lineText = `${safeDate(t.date)} · ${Number(t.totalPlayers || 0)} players · ${Number(
                      t.roundWins || 0
                    )}-${Number(t.roundLosses || 0)}`
                    return (
                      <li key={`t-${i}`} className="relative py-3">
                        <div className="absolute left-[7px] top-[18px] h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20" />
                        <div className="flex items-center justify-between gap-4">
                          {eventId ? (
                            <Link
                              to={`/events/${eventId}`}
                              className="flex-1 rounded-xl px-2 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                              <div className="pl-7">
                                <div className="font-medium">{t.storeName || "—"}</div>
                                <div className="text-xs text-white/70">{lineText}</div>
                              </div>
                            </Link>
                          ) : (
                            <div className="flex-1 pl-7">
                              <div className="font-medium">{t.storeName || "—"}</div>
                              <div className="text-xs text-white/70">{lineText}</div>
                            </div>
                          )}
                          <PlacementBadge placement={String(t.placement || "Top Cut")} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {tournaments.length > 12 ? (
                <div className="mt-3 text-xs text-white/60">Showing 12 of {tournaments.length}.</div>
              ) : null}
            </GlassCard>

            {/* Inventory */}
            <GlassCard>
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <SectionHeader icon={<Boxes className="h-4 w-4" />} title="Inventory" />
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

              {/* Inventory Tabs */}
              <div className="mb-4 flex flex-wrap gap-2">
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

              {/* Items Grid */}
              {invItems.length === 0 ? (
                <div className="text-sm text-white/70">
                  No {tabs.find((t) => t.key === invTab)?.label.toLowerCase()} match your search.
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {invItems.map((x, i) => (
                    <li
                      key={`${invTab}-${i}`}
                      className="group rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{String(x)}</span>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Fun ticker if they have lots of parts */}
              {totalPartsCount(parts) > 24 ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  <Marquee items={rollupParts(parts)} />
                </div>
              ) : null}
            </GlassCard>
          </div>

          {/* RIGHT: Quick Facts + Performance */}
          <div className="space-y-4">
            <GlassCard>
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
                {u.partsUpdatedAt ? (
                  <li className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Boxes className="h-4 w-4" /> Inventory updated {timeAgo(u.partsUpdatedAt)}
                  </li>
                ) : null}
              </ul>
            </GlassCard>

            <GlassCard>
              <div className="mb-2 text-sm font-semibold">Performance Snapshot</div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Matches" value={totalMatches} />
                <MiniStat label="Win rate" valueStr={`${winRate}%`} />
                <MiniStat label="Wins" value={totalWins} />
                <MiniStat label="Losses" value={totalLosses} />
              </div>
              <div className="mt-3 text-xs text-white/60">
                {firstEvent ? `First: ${safeDate(firstEvent.date)}` : "First: —"}{" "}
                {" · "}
                {latestEvent ? `Latest: ${safeDate(latestEvent.date)}` : "Latest: —"}
              </div>

              {/* momentum bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                  <Flame className="h-4 w-4" /> Momentum
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400"
                    style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-10 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ---------- Reusable UI ---------- */
function Skeleton() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="h-40 animate-pulse rounded-3xl bg-white/5" />
      <div className="mt-4 h-72 animate-pulse rounded-3xl bg-white/5" />
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-4 backdrop-blur-sm">
      {children}
    </div>
  )
}

function Pill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title || undefined}
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
      <span>{title}</span>
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
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold">{Number.isFinite(value) ? value : 0}</div>
    </div>
  )
}

function MiniStat({ label, value, valueStr }: { label: string; value?: number; valueStr?: string }) {
  const display = typeof valueStr === "string" ? valueStr : String(Number.isFinite(value) ? value : 0)
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{display}</div>
    </div>
  )
}

function PlacementBadge({ placement }: { placement: string }) {
  const p = String(placement || "")
  const tone =
    p === "First Place"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : p === "Second Place"
      ? "bg-slate-300/15 text-slate-200 border-slate-300/30"
      : p === "Third Place"
      ? "bg-amber-600/15 text-amber-200 border-amber-600/30"
      : "bg-indigo-500/15 text-indigo-200 border-indigo-500/30"
  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {p || "—"}
    </span>
  )
}

/* ---------- helpers ---------- */
type InvKey = "blades" | "assistBlades" | "ratchets" | "bits"
type TabMeta = { key: InvKey; label: string; count: number; icon: React.ReactNode }

function safeDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime())
    ? String(d)
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

function totalPartsCount(p: OwnedParts) {
  return (p.blades?.length || 0) + (p.assistBlades?.length || 0) + (p.ratchets?.length || 0) + (p.bits?.length || 0)
}

function rollupParts(p: OwnedParts) {
  const s: string[] = []
  ;(["blades", "assistBlades", "ratchets", "bits"] as const).forEach((k) => {
    const arr = p[k]
    if (Array.isArray(arr) && arr.length) s.push(...arr.map((x) => String(x)))
  })
  return s
}

/* Simple marquee for flexing big inventories */
function Marquee({ items }: { items: string[] }) {
  const list = Array.isArray(items) ? items.map((x) => String(x)) : []
  const track = [...list, ...list, ...list] // seamless loop feel
  return (
    <div className="relative h-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900 pointer-events-none" />
      <div className="animate-[scroll_24s_linear_infinite] whitespace-nowrap">
        {track.map((x, i) => (
          <span
            key={`mq-${i}`}
            className="mx-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            {x}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}
