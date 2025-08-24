import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarDays,
  CalendarPlus,
  MapPin,
  Users,
  Trophy,
  Crown,
  Medal,
  Share2,
  Swords,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { Helmet } from "react-helmet-async"
import BladeUsagePie from "../components/BladeUsagePie"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* ------------------------------
   Types
---------------------------------*/
type Combo = {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
  notes?: string
}
interface Player {
  name: string
  combos: Combo[]
  userId?: string
  userSlug?: string
}

interface Event {
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  topCut?: Player[]
  capacity?: number
  country?: string
  region?: string
  city?: string
  attendeeCount?: number
}

interface Post {
  username: string
  content: string
  timestamp: string
  image?: string
  badge?: string
}

/* ------------------------------
   Small utils
---------------------------------*/
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return n + (s[n % 10] || s[0])
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

/* ------------------------------
   Tournament Lab parity grading
   (exact same math/weights/caps)
---------------------------------*/

// TL-side primitive types
type TLCombo = { blade: string; ratchet: string; bit: string }
type TLResult = {
  submittedCombo: TLCombo
  topCutAppearances: number
  uniqueEvents: number
  mostRecentAppearance?: string
  firstSeen?: string
}
type TLGlobalMeta = { comboAppearancesAll: number[] }

// grade label exposed to UI
type DeckLabel = "S" | "A" | "B" | "C" | "D" | "Incomplete"

const GRADE_STYLES: Record<DeckLabel, string> = {
  S: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  A: "border-sky-500/30 text-sky-300 bg-sky-500/10",
  B: "border-indigo-500/30 text-indigo-300 bg-indigo-500/10",
  C: "border-amber-500/30 text-amber-300 bg-amber-500/10",
  D: "border-rose-500/30 text-rose-300 bg-rose-500/10",
  Incomplete: "border-white/10 bg-white/5 text-white/70",
}

// normalizers / keys (same behavior as TL)
function tlNormalize(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}
function tlKey(c: TLCombo) {
  return `${tlNormalize(c.blade)}|${tlNormalize(c.ratchet)}|${tlNormalize(c.bit)}`
}

// stats helpers (same as TL)
function daysSince(iso?: string) {
  if (!iso) return Infinity
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return Infinity
  return Math.max(0, (Date.now() - d) / (1000 * 60 * 60 * 24))
}
function decayFromDays(days: number, lambda = 60) {
  if (!Number.isFinite(days)) return 0
  return Math.exp(-days / lambda)
}
function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 1
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1))))
  return Math.max(1, sorted[idx])
}
function mapScoreToGrade(score: number): Exclude<DeckLabel, "Incomplete"> {
  if (score >= 90) return "S"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  return "D"
}

// EXACT computeDeckGrade (no coverage path)
function computeDeckGrade({
  results,
  combos,
  visibleCombos,
  globalMeta,
}: {
  results: TLResult[]
  combos: TLCombo[]
  visibleCombos: number
  globalMeta: TLGlobalMeta
}) {
  if (!results || results.length === 0) return null

  const used = results.slice(0, Math.min(3, visibleCombos))

  // per-combo strength/recency
  const p95 = Math.max(1, percentile(globalMeta.comboAppearancesAll, 95))
  const recencies: number[] = []
  const comboScores: number[] = []

  for (const r of used) {
    const appearances = Math.max(0, Number(r?.topCutAppearances ?? 0))
    const mostRecent = r?.mostRecentAppearance as string | undefined

    const strength_i = Math.pow(Math.min(appearances / p95, 1), 0.60) * 100
    const recency_i  = clamp01(decayFromDays(daysSince(mostRecent), 75)) * 100

    recencies.push(recency_i)
    comboScores.push(0.70 * strength_i + 0.30 * recency_i)
  }

  const deckStrength = 0.60 * Math.min(...comboScores) + 0.40 * mean(comboScores)
  const deckRecency  = Math.max(0, Math.min(100, 0.60 * Math.min(...recencies) + 0.40 * mean(recencies)))

  // diversity
  const slice = combos.slice(0, Math.min(3, visibleCombos))
  const parts  = slice.flatMap(c => [c.blade, c.ratchet, c.bit]).filter(Boolean)
  const unique = new Set(parts.map(tlNormalize)).size
  const partsUniqueRatio = parts.length ? unique / parts.length : 0
  const diversity = Math.round(partsUniqueRatio * 100)

  // base score
  let score = Math.round(0.60 * deckStrength + 0.25 * deckRecency + 0.15 * diversity)

  // safety caps
  const anyZeroApps = used.some(r => Number(r?.topCutAppearances ?? 0) === 0)
  const anyLowApps  = used.some(r => Number(r?.topCutAppearances ?? 0) < 2)
  const anyStale    = used.some(r => daysSince(r?.mostRecentAppearance) > 180)

  let cap = 100
  if (anyZeroApps) cap = Math.min(cap, 70)
  else if (anyLowApps) cap = Math.min(cap, 85)
  if (anyStale) cap = Math.min(cap, 80)
  score = Math.min(score, cap)

  const grade = mapScoreToGrade(score)

  const totalAppearances = used.reduce((a, r) => a + Number(r?.topCutAppearances ?? 0), 0)
  const confidence = totalAppearances >= 30 ? "High" : totalAppearances >= 10 ? "Medium" : "Low"

  return {
    score,
    grade,
    confidence,
    components: {
      strength: Math.round(deckStrength),
      recency: Math.round(deckRecency),
      diversity,
    },
    partsUniqueRatio,
  }
}

/* ------------------------------
   Page
---------------------------------*/
export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [tab, setTab] = useState<"overview" | "topcut" | "discussion">("overview")

  // discussion
  const [posts, setPosts] = useState<Post[]>([])
  const [postContent, setPostContent] = useState("")
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  // Global combo index (from all events) → same evidence TL uses
  const [comboIndex, setComboIndex] = useState<Record<string, {
    appearances: number
    uniqueEvents: Set<string>
    mostRecent?: string
    firstSeen?: string
  }>>({})
  const [tlGlobalMeta, setTlGlobalMeta] = useState<TLGlobalMeta>({ comboAppearancesAll: [] })

  // load event
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/events/${id}`)
        if (!res.ok) throw new Error("Event not found")
        const data = await res.json()
        setEvent(data)
      } catch (e) {
        console.error(e)
        toast.error("Event not found or data is invalid.")
      }
    }
    load()
  }, [id])

  // build TL evidence from ALL events (appearances + recency)
  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetch(`${API}/events`)
        const data: any[] = await res.json()

        const idx: Record<string, { appearances: number; uniqueEvents: Set<string>; mostRecent?: string; firstSeen?: string }> = {}
        const appCounts: number[] = []

        for (const ev of data) {
          const evId = String(ev.id)
          const evDate = ev.endTime || ev.startTime
          ev?.topCut?.forEach((p: any) => {
            p?.combos?.forEach((c: any) => {
              if (!c?.blade || !c?.ratchet || !c?.bit) return
              const key = tlKey({ blade: c.blade, ratchet: c.ratchet, bit: c.bit })
              if (!idx[key]) idx[key] = { appearances: 0, uniqueEvents: new Set<string>() }
              idx[key].appearances += 1
              idx[key].uniqueEvents.add(evId)
              // recency tracking
              if (evDate) {
                if (!idx[key].mostRecent || new Date(evDate) > new Date(idx[key].mostRecent)) {
                  idx[key].mostRecent = evDate
                }
                if (!idx[key].firstSeen || new Date(evDate) < new Date(idx[key].firstSeen)) {
                  idx[key].firstSeen = evDate
                }
              }
            })
          })
        }

        for (const k of Object.keys(idx)) appCounts.push(idx[k].appearances)

        setComboIndex(idx)
        setTlGlobalMeta({ comboAppearancesAll: appCounts })
      } catch (e) {
        console.error("Failed to build TL index", e)
        setComboIndex({})
        setTlGlobalMeta({ comboAppearancesAll: [] })
      }
    }
    loadAll()
  }, [])

  // load discussion
  useEffect(() => {
    if (!event) return
    setLoadingPosts(true)
    fetch(`${API}/forum/${event.id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setPosts([])
          return
        }
        if (!res.ok) throw new Error("Failed to fetch posts")
        const data = await res.json()
        setPosts(data.posts || [])
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [event])

  // Compute TL-grade label for a player's first 3 full combos
  function gradeDeckFromCombos(combos?: Combo[]): DeckLabel {
    const three: TLCombo[] =
      (combos || [])
        .filter(c => c?.blade && c?.ratchet && c?.bit)
        .slice(0, 3)
        .map(c => ({ blade: c.blade, ratchet: c.ratchet, bit: c.bit }))

    if (three.length < 3) return "Incomplete"

    // transform into TL results using our combo index
    const results: TLResult[] = three.map(c => {
      const k = tlKey(c)
      const rec = comboIndex[k]
      return {
        submittedCombo: c,
        topCutAppearances: rec?.appearances ?? 0,
        uniqueEvents: rec?.uniqueEvents?.size ?? 0,
        mostRecentAppearance: rec?.mostRecent,
        firstSeen: rec?.firstSeen,
      }
    })

    const dg = computeDeckGrade({
      results,
      combos: three,
      visibleCombos: 3,
      globalMeta: tlGlobalMeta,
    })

    return (dg?.grade ?? "D") as DeckLabel
  }

  const submitPost = async () => {
    const curr = event
    if (!user || !postContent.trim() || !curr) return
    setSubmittingPost(true)

    let imageBase64 = ""
    if (selectedImage) {
      try {
        const reader = new FileReader()
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedImage)
        })
      } catch {
        toast.error("Failed to read image.")
        setSubmittingPost(false)
        return
      }
    }

    const res = await fetch(`${API}/forum/${curr.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username || "Anonymous",
        content: postContent,
        image: imageBase64 || undefined,
      }),
    })

    setSubmittingPost(false)

    if (res.ok) {
      setPostContent("")
      setSelectedImage(null)
      // refresh posts (so badges get applied)
      const r = await fetch(`${API}/forum/${curr.id}`)
      if (r.ok) {
        const data = await r.json()
        setPosts(data.posts || [])
      }
    } else {
      toast.error("Failed to submit post.")
    }
  }

  const deletePost = async (idx: number) => {
    if (!user || !event) return
    if (!window.confirm("Delete this post?")) return

    const res = await fetch(`${API}/forum/${event.id}/post/${idx}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username }),
    })
    if (res.ok) {
      setPosts((prev) => prev.filter((_, i) => i !== idx))
    } else {
      toast.error("Failed to delete post.")
    }
  }

  const handleCalendar = () => {
    if (!event) return
    const start = new Date(event.startTime).toISOString().replace(/-|:|\.\d+/g, "")
    const end = new Date(event.endTime).toISOString().replace(/-|:|\.\d+/g, "")
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.store}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n")

    const blob = new Blob([ics], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.title}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success("Calendar file downloaded ✨")
  }

  if (!event) return <div className="p-6">Loading…</div>

  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const isUpcoming = end > new Date()
  const location = [event.city, event.region, event.country].filter(Boolean).join(", ")
  const topCutCount = event.topCut?.length || 0

  /* ------------------------------
     UI helpers
  ---------------------------------*/
  const StatChip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs">
      {icon}
      {label}
    </span>
  )

  const PodiumCard = ({
    place,
    name,
    tone,
  }: {
    place: "Champion" | "Second" | "Third"
    name?: string
    tone: "gold" | "silver" | "bronze"
  }) => {
    const toneMap = {
      gold: "from-yellow-400/25 to-amber-500/20",
      silver: "from-indigo-300/20 to-slate-300/10",
      bronze: "from-orange-400/25 to-amber-700/10",
    } as const
    return (
      <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${toneMap[tone]} p-4`}>
        <div className="text-xs uppercase tracking-wide text-white/70 flex items-center gap-1">
          {place === "Champion" ? <Crown className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
          {place}
        </div>
        <div className="mt-1 text-lg font-semibold truncate flex items-center gap-2">
          {place === "Champion" ? <Crown className="h-5 w-5 text-yellow-300" /> : null}
          {name || "—"}
        </div>
      </div>
    )
  }

  const ComboList = ({ combos }: { combos: Combo[] }) => (
    <ul className="space-y-1">
      {combos.map((c, i) => (
        <li key={i} className="rounded-xl bg-white/5 px-2.5 py-2">
          <div className="text-sm md:text-base leading-snug">
            <span className="font-medium">{c.blade}</span>
            {c.assistBlade ? <span className="opacity-80"> / {c.assistBlade}</span> : null}
            <span className="opacity-80"> / {c.ratchet} / {c.bit}</span>
          </div>
          {c.notes ? (
            <div className="mt-0.5 text-xs italic text-white/60">
              Note: {c.notes}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )

  /* ------------------------------
     Render
  ---------------------------------*/
  return (
    <>
      <Helmet>
        <title>{`${event.title} — Beyblade Tournament`}</title>
        <meta
          name="description"
          content={`View details for ${event.title} at ${event.store} on ${start.toLocaleDateString()}. Hosted in ${location}.`}
        />
        <meta property="og:title" content={`${event.title} — Beyblade Tournament`} />
        <meta property="og:description" content={`Join or review ${event.title} hosted by ${event.store} in ${location}.`} />
        <meta property="og:url" content={`https://www.metabeys.com/events/${event.id}`} />
        {event.imageUrl && <meta property="og:image" content={event.imageUrl} />}
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div
        className="mx-auto max-w-6xl p-4 md:p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* HERO */}
        <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/15 via-sky-600/10 to-fuchsia-600/10 p-5 md:p-6">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
              loading="lazy"
            />
          ) : null}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <CalendarDays className="h-4 w-4" />
              <span>{fmtDate(start)}</span>
              <span>•</span>
              <span>{fmtTime(start)} – {fmtTime(end)}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.store}</span>
              {location ? <span className="opacity-80">· {location}</span> : null}
            </div>

            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              {event.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatChip icon={<Users className="h-3.5 w-3.5" />} label={`${event.attendeeCount ?? 0} players`} />
              <StatChip icon={<Trophy className="h-3.5 w-3.5" />} label={`Top Cut ${topCutCount}`} />
              <button
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success("Link copied.")
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              {isUpcoming ? (
                <button
                  onClick={handleCalendar}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600/90 px-2.5 py-1 text-xs font-medium hover:bg-indigo-500"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Add to Calendar
                </button>
              ) : null}
              {event.buyLink ? (
                <a
                  href={event.buyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
                >
                  🎟️ Buy Ticket
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-2">
          {[
            { key: "overview", label: "Overview", icon: BarChart3 },
            { key: "topcut", label: "Top Cut", icon: Swords },
            { key: "discussion", label: "Discussion", icon: MessageSquare },
          ].map(({ key, label, icon: Icon }) => {
            const active = tab === (key as typeof tab)
            return (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
                  active ? "bg-indigo-600/90 text-white" : "border border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>

        {/* Panels */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                {/* Left: core info */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Date" value={fmtDate(start)} />
                      <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Time" value={`${fmtTime(start)} – ${fmtTime(end)}`} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Store" value={event.store} />
                      {location ? <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={location} /> : null}
                      {(!isUpcoming && event.attendeeCount !== undefined) ? (
                        <InfoRow icon={<Users className="h-4 w-4" />} label="Players attended" value={String(event.attendeeCount)} />
                      ) : null}
                      {(isUpcoming && event.capacity !== undefined) ? (
                        <InfoRow icon={<Users className="h-4 w-4" />} label="Capacity" value={`${event.capacity} players`} />
                      ) : null}
                    </div>
                  </div>

                  {/* If top cut exists, show meta + pie here too */}
                  {event.topCut?.length ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Meta snapshot
                      </div>
                      <BladeUsagePie players={event.topCut} />
                    </div>
                  ) : null}
                </div>

                {/* Right: highlights */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 text-sm font-semibold">Highlights</div>
                    <ul className="space-y-2 text-sm">
                      <li className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <Trophy className="h-4 w-4" /> {topCutCount} top-cut entrants
                      </li>
                      <li className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <Users className="h-4 w-4" /> {event.attendeeCount ?? 0} players
                      </li>
                    </ul>
                    <Link to="#discussion" onClick={() => setTab("discussion")} className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                      Open discussion →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "topcut" && (
              <motion.div
                key="topcut"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                {/* Podium */}
                {event.topCut?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">Podium</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <PodiumCard place="Second" name={event.topCut[1]?.name} tone="silver" />
                      <PodiumCard place="Champion" name={event.topCut[0]?.name} tone="gold" />
                      <PodiumCard place="Third" name={event.topCut[2]?.name} tone="bronze" />
                    </div>
                  </div>
                ) : null}

                {/* Full Top Cut list (Deck Score with TL parity) */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      Top Cut Entrants <span className="opacity-60">({topCutCount})</span>
                    </div>
                  </div>

                  {!event.topCut?.length ? (
                    <div className="text-sm text-white/60">Top cut not posted.</div>
                  ) : (
                    <div className="space-y-3">
                      {event.topCut.map((p, i) => {
                        const grade = gradeDeckFromCombos(p.combos)
                        return (
                          <div
                            key={p.name + i}
                            className="rounded-2xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-medium">
  {ordinal(i + 1)} — {p.userSlug ? (
  <Link
    to={`/u/${encodeURIComponent(p.userSlug)}`}   // ← was `/users/${p.userSlug}`
    className="text-indigo-300 hover:text-indigo-200 underline"
    title={p.name !== p.userSlug ? `${p.name} (@${p.userSlug})` : `@${p.userSlug}`}
  >
    {p.name}
  </Link>
) : (
  p.name
)}

</div>

                              </div>

                              {/* Deck Score pill */}
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${GRADE_STYLES[grade]}`}>
                                Deck Score: <strong className="ml-0.5">{grade}</strong>
                              </span>
                            </div>

                            {p.combos?.length ? (
                              <ComboList combos={p.combos} />
                            ) : (
                              <div className="text-sm text-white/60">No combos submitted.</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === "discussion" && (
              <motion.div
                key="discussion"
                id="discussion"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" /> Event Discussion
                </div>

                {loadingPosts ? (
                  <p>Loading posts…</p>
                ) : posts.length === 0 ? (
                  <p className="italic text-white/60 mb-6">No posts yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 mb-6">
                    {posts.map((post, i) => (
                      <article key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <header className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-indigo-300">{post.username}</span>
                            {post.badge ? (
                              <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300">
                                {post.badge}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <time className="text-xs text-white/60" dateTime={post.timestamp}>
                              {new Date(post.timestamp).toLocaleDateString()}
                            </time>
                            {user?.username === post.username ? (
                              <button className="text-xs text-red-400 hover:text-red-300 underline" onClick={() => deletePost(i)}>
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </header>
                        <p className="whitespace-pre-wrap text-sm md:text-base">{post.content}</p>
                        {post.image ? (
                          <img src={post.image} alt="Attached" className="mt-2 max-h-80 w-full rounded-lg object-contain" />
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}

                {!user ? (
                  <p className="text-center text-red-500 font-semibold">
                    You must <Link to="/user-auth" className="text-indigo-300 underline">log in</Link> to post.
                  </p>
                ) : (
                  <div className="mt-2">
                    <label className="mb-1 block text-sm">Attach Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setSelectedImage(e.target.files[0])
                      }}
                      className="mb-3 block w-full text-sm text-white/80 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
                    />
                    <textarea
                      className="w-full min-h-[110px] resize-y rounded-md border border-white/10 bg-white/5 p-3 outline-none focus:border-indigo-500/50"
                      placeholder="Write your message…"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      disabled={submittingPost}
                    />
                    <button
                      onClick={submitPost}
                      disabled={submittingPost || !postContent.trim()}
                      className={`mt-3 w-full rounded-md py-3 font-semibold transition ${
                        submittingPost || !postContent.trim()
                          ? "bg-indigo-700/60 text-white/60"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                    >
                      {submittingPost ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

/* ------------------------------
   Local piece
---------------------------------*/
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  )
}
