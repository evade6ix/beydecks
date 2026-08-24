import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Crown,
  ExternalLink,
  History,
  MapPin,
  Medal,
  Package,
  Share2,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import VipBanner from "../components/VipBanner"
import { TROPHY_AWARDS } from "../data/trophies"

const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

const FORCE_VIP_USERNAMES = new Set(["Karl6ix"])
const reveal = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38 },
}

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
  eventId?: string | number
}

type PublicUser = {
  id: string | number
  username?: string
  displayName: string
  slug: string
  vip?: boolean
  avatarDataUrl?: string
  bio?: string
  homeStore?: string
  ownedParts?: OwnedParts
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

type MetricTone = "indigo" | "sky" | "amber" | "emerald"

export default function UserPublic() {
  const { slug } = useParams()
  const [u, setU] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invTab, setInvTab] = useState<InvKey>("blades")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const slugStr = String(slug || "")
    const url = api(`/api/users/slug/${encodeURIComponent(slugStr)}`)

    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text())
        return response.json()
      })
      .then((data) => {
        if (mounted) setU(data)
      })
      .catch((requestError) => {
        if (mounted) setError(requestError?.message || "Failed to load profile")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [slug])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (loading) return <ProfileLoading />

  if (error || !u) {
    return (
      <main className="min-h-screen bg-[#070a12] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-rose-400/15 bg-[#0c1120] p-8 shadow-2xl shadow-black/20">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">Profile unavailable</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">We could not find this player.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">The profile may have moved, been removed, or the link may be incorrect.</p>
            <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]">
              <ArrowLeft className="h-4 w-4" /> Back to MetaBeys
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const parts: OwnedParts = {
    blades: (u.blades && u.blades.length ? u.blades : u.ownedParts?.blades) || [],
    assistBlades: (u.assistBlades && u.assistBlades.length ? u.assistBlades : u.ownedParts?.assistBlades) || [],
    ratchets: (u.ratchets && u.ratchets.length ? u.ratchets : u.ownedParts?.ratchets) || [],
    bits: (u.bits && u.bits.length ? u.bits : u.ownedParts?.bits) || [],
  }

  const collectionCount = parts.blades.length + (parts.assistBlades?.length || 0) + parts.ratchets.length + parts.bits.length
  const shareUrl = `${window.location.origin}/u/${u.slug}`

  const tournaments = (Array.isArray(u.tournamentsPlayed) ? [...u.tournamentsPlayed] : [])
    .filter(Boolean)
    .filter((tournament) => Boolean(tournament.eventId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const tournamentsCount = tournaments.length
  const firsts = tournaments.filter((tournament) => tournament.placement === "First Place").length
  const seconds = tournaments.filter((tournament) => tournament.placement === "Second Place").length
  const thirds = tournaments.filter((tournament) => tournament.placement === "Third Place").length
  const nonPodiumTopCuts = tournaments.filter((tournament) => tournament.placement === "Top Cut").length
  const topCutCount = firsts + seconds + thirds + nonPodiumTopCuts
  const podiumCount = firsts + seconds + thirds

  const nameForDisplay = u.username && u.username.trim().length > 0 ? u.username : u.displayName
  const isForceVip = FORCE_VIP_USERNAMES.has(String(u.username || "").trim())
  const isVip = Boolean(u.vip) || isForceVip
  const trophyKey = String(u.slug || slug || u.username || u.displayName || "").trim().toLowerCase()

  const trophies = !trophyKey
    ? []
    : TROPHY_AWARDS
        .filter((trophy) => String(trophy.username || "").trim().toLowerCase() === trophyKey)
        .slice()
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${nameForDisplay} — MetaBeys Profile`, url: shareUrl })
        return
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      // Clipboard support is not guaranteed in every embedded browser.
    }
  }

  const HeroInner = (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1120] shadow-2xl shadow-black/20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_12%_110%,rgba(14,165,233,0.18),transparent_38%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative w-fit shrink-0">
              <img
                src={u.avatarDataUrl || "/default-avatar.png"}
                alt={`${nameForDisplay}'s avatar`}
                className="h-24 w-24 rounded-[26px] border border-white/15 object-cover shadow-xl shadow-black/30 sm:h-28 sm:w-28"
                draggable={false}
              />
              <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-indigo-500 text-white shadow-lg">
                <Target className="h-4 w-4" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Player profile</span>
                {isVip ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 truncate text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">{nameForDisplay}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-sky-300" />{u.homeStore || "Home store not listed"}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-indigo-300" />{tournamentsCount} tournament records</span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{u.bio || "Competitive Beyblade profile, tournament history, achievements, and collection."}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Link copied" : "Share profile"}
            </button>
            <Link to="/events/completed" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-400">
              Browse events <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <Helmet>
        <title>{nameForDisplay} — MetaBeys Profile</title>
        <meta name="description" content={u.bio || `${nameForDisplay}'s MetaBeys profile`} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:title" content={`${nameForDisplay} — MetaBeys Profile`} />
        <meta property="og:description" content={u.bio || ""} />
        {u.avatarDataUrl ? <meta property="og:image" content={u.avatarDataUrl} /> : null}
      </Helmet>

      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {isVip ? <VipBanner>{HeroInner}</VipBanner> : HeroInner}

        <motion.section {...reveal} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Crown className="h-5 w-5" />} label="Championships" value={String(firsts)} detail={`${tournamentsCount} events recorded`} tone="amber" />
          <MetricCard icon={<Medal className="h-5 w-5" />} label="Podium finishes" value={String(podiumCount)} detail={`${seconds} silver · ${thirds} bronze`} tone="sky" />
          <MetricCard icon={<Trophy className="h-5 w-5" />} label="Top cuts" value={String(topCutCount)} detail={`${nonPodiumTopCuts} outside the podium`} tone="indigo" />
          <MetricCard icon={<Package className="h-5 w-5" />} label="Collection" value={String(collectionCount)} detail="parts listed publicly" tone="emerald" />
        </motion.section>

        <motion.div {...reveal} className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
          <div className="space-y-5">
            <Panel>
              <SectionHeading
                eyebrow="Competitive record"
                title="Tournament history"
                description="Verified event appearances and finishes, newest first."
                icon={<History className="h-5 w-5" />}
              />

              {tournaments.length ? (
                <div className="mt-5 divide-y divide-white/[0.06]">
                  {tournaments.slice(0, 10).map((tournament, index) => (
                    <TournamentRow key={`${tournament.eventId}-${tournament.date}-${index}`} tournament={tournament} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Trophy className="h-6 w-6" />} title="No tournament results yet" description="Verified event results will appear here once they are attached to this profile." />
              )}

              {tournaments.length > 10 ? (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2 text-xs text-white/35">Showing the 10 most recent of {tournaments.length} tournament records.</div>
              ) : null}
            </Panel>

            <InventorySection parts={parts} invTab={invTab} onChangeTab={setInvTab} />
          </div>

          <div className="space-y-5">
            <Panel>
              <SectionHeading eyebrow="Player card" title="About" description="A quick snapshot of the player behind the results." icon={<Sparkles className="h-5 w-5" />} />
              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-white/60">{u.bio || "No bio has been added yet."}</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickFact icon={<MapPin className="h-4 w-4" />} label="Home store" value={u.homeStore || "Not listed"} />
                <QuickFact icon={<Users className="h-4 w-4" />} label="Tournament appearances" value={String(tournamentsCount)} />
              </div>
            </Panel>

            <Panel>
              <SectionHeading eyebrow="Achievements" title="Trophy cabinet" description="Community awards and tournament milestones." icon={<Crown className="h-5 w-5" />} />

              {trophies.length ? (
                <div className="mt-5 space-y-3">
                  {trophies.map((trophy, index) => {
                    const external = /^https?:\/\//i.test(String(trophy.eventUrl || ""))
                    const inner = (
                      <>
                        <img src={trophy.image} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-amber-300/15 object-cover" draggable={false} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{trophy.placement}</p>
                          <p className="mt-1 truncate text-xs text-white/40">{trophy.note || trophy.event}{trophy.date ? ` · ${safeDate(trophy.date)}` : ""}</p>
                        </div>
                        {trophy.eventUrl ? <ExternalLink className="h-4 w-4 text-white/25" /> : null}
                      </>
                    )
                    const className = "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition hover:border-amber-300/20 hover:bg-amber-300/[0.04]"

                    if (!trophy.eventUrl) return <div key={`${trophy.id}-${index}`} className={className}>{inner}</div>
                    if (external) return <a key={`${trophy.id}-${index}`} href={trophy.eventUrl} target="_blank" rel="noreferrer" className={className}>{inner}</a>
                    return <Link key={`${trophy.id}-${index}`} to={trophy.eventUrl} className={className}>{inner}</Link>
                  })}
                </div>
              ) : (
                <EmptyState compact icon={<Medal className="h-5 w-5" />} title="Cabinet ready" description="Awards and trophies will appear here as they are earned." />
              )}
            </Panel>

            <div className="relative overflow-hidden rounded-[24px] border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-[#10162a] to-sky-500/[0.08] p-5 shadow-xl shadow-black/15">
              <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Public profile</p>
                <h3 className="mt-2 text-xl font-black tracking-tight">Built for the competitive record.</h3>
                <p className="mt-2 text-sm leading-6 text-white/45">Results, achievements, and collection data stay together in one shareable player page.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-white/45 transition hover:text-white/80">
            <ArrowLeft className="h-4 w-4" /> Back to MetaBeys
          </Link>
        </div>
      </div>
    </main>
  )
}

function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="h-52 animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.035]" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-28 animate-pulse rounded-[22px] border border-white/[0.05] bg-white/[0.025]" />)}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
          <div className="h-96 animate-pulse rounded-[24px] border border-white/[0.05] bg-white/[0.025]" />
          <div className="h-72 animate-pulse rounded-[24px] border border-white/[0.05] bg-white/[0.025]" />
        </div>
      </div>
    </main>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-white/[0.08] bg-[#0c101b] p-5 shadow-xl shadow-black/10 sm:p-6 ${className}`}>{children}</section>
}

function SectionHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-400/10 text-indigo-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-white/40">{description}</p>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: MetricTone }) {
  const tones: Record<MetricTone, string> = {
    indigo: "border-indigo-400/15 bg-indigo-400/[0.07] text-indigo-300",
    sky: "border-sky-400/15 bg-sky-400/[0.07] text-sky-300",
    amber: "border-amber-300/15 bg-amber-300/[0.07] text-amber-200",
    emerald: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
  }

  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-[#0c101b] p-4 shadow-lg shadow-black/10">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-white/30">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-white/35">{detail}</p>
    </div>
  )
}

function TournamentRow({ tournament }: { tournament: TournamentEntry }) {
  const row = (
    <div className="group flex items-center gap-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/35 transition group-hover:border-indigo-400/15 group-hover:text-indigo-300">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{tournament.storeName}</p>
        <p className="mt-1 text-xs text-white/35">{safeDate(tournament.date)} · {tournament.totalPlayers} players · {tournament.roundWins}–{tournament.roundLosses}</p>
      </div>
      <PlacementBadge placement={tournament.placement} />
      <ExternalLink className="hidden h-4 w-4 shrink-0 text-white/20 sm:block" />
    </div>
  )

  return tournament.eventId ? (
    <Link to={`/events/${tournament.eventId}`} className="block rounded-xl px-2 transition hover:bg-white/[0.025] focus:outline-none focus:ring-2 focus:ring-indigo-500/30">{row}</Link>
  ) : row
}

function PlacementBadge({ placement }: { placement: string }) {
  const tone = placement === "First Place"
    ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
    : placement === "Second Place"
      ? "border-slate-300/20 bg-slate-300/10 text-slate-200"
      : placement === "Third Place"
        ? "border-orange-400/20 bg-orange-400/10 text-orange-200"
        : placement === "Top Cut"
          ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
          : "border-white/10 bg-white/[0.04] text-white/45"

  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>{placement}</span>
}

function QuickFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/35">{icon}{label}</div>
      <p className="mt-2 truncate text-sm font-bold text-white/80">{value}</p>
    </div>
  )
}

function EmptyState({ icon, title, description, compact = false }: { icon: React.ReactNode; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`mt-5 rounded-2xl border border-dashed border-white/[0.09] bg-black/10 text-center ${compact ? "p-5" : "p-8"}`}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-white/25">{icon}</div>
      <p className="mt-3 text-sm font-bold text-white/70">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/35">{description}</p>
    </div>
  )
}

function safeDate(date: string) {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function InventorySection({ parts, invTab, onChangeTab }: { parts: OwnedParts; invTab: InvKey; onChangeTab: (key: InvKey) => void }) {
  const tabs = useMemo(() => [
    { key: "blades" as const, label: "Blades", count: parts.blades.length },
    { key: "assistBlades" as const, label: "Assist Blades", count: parts.assistBlades?.length || 0 },
    { key: "ratchets" as const, label: "Ratchets", count: parts.ratchets.length },
    { key: "bits" as const, label: "Bits", count: parts.bits.length },
  ], [parts.assistBlades?.length, parts.bits.length, parts.blades.length, parts.ratchets.length])

  const items = invTab === "blades"
    ? parts.blades
    : invTab === "assistBlades"
      ? parts.assistBlades || []
      : invTab === "ratchets"
        ? parts.ratchets
        : parts.bits

  return (
    <Panel>
      <SectionHeading eyebrow="Loadout" title="Collection" description="The parts this player has chosen to show on their public profile." icon={<Package className="h-5 w-5" />} />

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/15 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const active = invTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeTab(tab.key)}
                aria-pressed={active}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${active ? "text-white" : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"}`}
              >
                {active ? <motion.span layoutId="public-collection-tab" className="absolute inset-0 rounded-xl border border-indigo-400/20 bg-indigo-500/15" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} /> : null}
                <span className="relative">{tab.label}</span>
                <span className={`relative rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-indigo-400/20 text-indigo-200" : "bg-white/[0.06] text-white/30"}`}>{tab.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {items.length ? (
        <motion.ul key={invTab} {...reveal} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li key={`${invTab}-${item}-${index}`} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm font-semibold text-white/70 transition hover:border-indigo-400/15 hover:bg-indigo-400/[0.035] hover:text-white">
              {item}
            </li>
          ))}
        </motion.ul>
      ) : (
        <EmptyState compact icon={<Package className="h-5 w-5" />} title={`No ${tabs.find((tab) => tab.key === invTab)?.label.toLowerCase()} listed`} description="This player has not added any public items in this category yet." />
      )}
    </Panel>
  )
}
