import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import CountUp from "react-countup"
import Marquee from "react-fast-marquee"
import Tilt from "react-parallax-tilt"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Globe2,
  MapPin,
  Radar,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

type Timeframe = "all" | "year" | "month" | "week"

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
}
interface Player {
  name: string
  combos: Combo[]
}
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
  imageUrl?: string
  buyLink?: string
}
interface Store {
  id: number | string
  name: string
  city?: string
  region?: string
  country?: string
  logo?: string
}

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ")
const fmtDate = (d: string | number | Date) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

/* =========================
   Premium Background: Grid + Glow + Cursor
   ========================= */
function UltraBG() {
  const ref = useRef<HTMLDivElement | null>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.35 })
  const sy = useSpring(my, { stiffness: 120, damping: 18, mass: 0.35 })

  const x = useTransform(sx, v => `${v}px`)
  const y = useTransform(sy, v => `${v}px`)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      mx.set(e.clientX - r.left)
      my.set(e.clientY - r.top)
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [mx, my])

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-[#070A12]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_35%,rgba(99,102,241,0.20)_0%,transparent_55%),radial-gradient(55%_55%_at_75%_65%,rgba(34,211,238,0.14)_0%,transparent_60%),radial-gradient(55%_55%_at_25%_70%,rgba(168,85,247,0.12)_0%,transparent_62%)]" />

      {/* Cursor light */}
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
        style={{
          left: x,
          top: y,
          background:
            "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.45) 0%, rgba(99,102,241,0.22) 38%, transparent 70%)",
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.10] mix-blend-soft-light pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.55'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}

/* =========================
   Landing Page (New Design)
   ========================= */
export default function Landing() {
  const [comboCount, setComboCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [storeCount, setStoreCount] = useState(0)
  const [topCombos, setTopCombos] = useState<Array<Combo & { appearances: number; eventCount: number }>>([])
  const [upcoming, setUpcoming] = useState<EventItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>("all")

  useEffect(() => {
    let mounted = true
    Promise.all([fetch(`${API}/events`).then(r => r.json()), fetch(`${API}/stores`).then(r => r.json())])
      .then(([eventsData, storesData]: [EventItem[], Store[]]) => {
        if (!mounted) return

        const now = new Date()
        const windowStart = (() => {
          if (timeframe === "year") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          if (timeframe === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          if (timeframe === "week") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          return new Date(0)
        })()

        const filtered = (eventsData || []).filter(e => new Date(e.startTime || e.date || 0) >= windowStart)
        setEventCount(filtered.length)

        setStores(storesData || [])
        setStoreCount((storesData || []).length)

        const upcomingList = (eventsData || [])
          .filter(e => new Date(e.startTime || e.date || 0) >= now)
          .sort((a, b) => new Date(a.startTime || a.date || 0).getTime() - new Date(b.startTime || b.date || 0).getTime())
          .slice(0, 18)
        setUpcoming(upcomingList)

        // ---- combo aggregation (appearances + unique events) ----
        type ComboStat = Combo & { appearances: number; eventIds: Set<string | number> }
        const map = new Map<string, ComboStat>()
        let totalAppearances = 0

        filtered.forEach(ev => {
          const evId = ev.id ?? `${ev.title}-${ev.startTime || ev.date || ""}`
          ;(ev.topCut || []).forEach(player => {
            ;(player?.combos || []).forEach(c => {
              const key = `${norm(c.blade)}|||${norm(c.ratchet)}|||${norm(c.bit)}`
              const stat = map.get(key)
              if (stat) {
                stat.appearances += 1
                stat.eventIds.add(evId)
              } else {
                map.set(key, { ...c, appearances: 1, eventIds: new Set([evId]) })
              }
              totalAppearances += 1
            })
          })
        })

        const sorted = [...map.values()].sort((a, b) => b.appearances - a.appearances)

        // pick 3 that don't share parts
        const used = new Set<string>()
        const uniqueTop: Array<Combo & { appearances: number; eventCount: number }> = []
        for (const c of sorted) {
          const parts = [c.blade, c.ratchet, c.bit]
          if (parts.every(p => !used.has(norm(p)))) {
            uniqueTop.push({ ...c, appearances: c.appearances, eventCount: c.eventIds.size })
            parts.forEach(p => used.add(norm(p)))
            if (uniqueTop.length === 3) break
          }
        }

        setTopCombos(uniqueTop)
        setComboCount(totalAppearances)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [timeframe])

  const storeNames = useMemo(() => (stores || []).map(s => s.name).filter(Boolean).slice(0, 40), [stores])

  return (
    <>
      <Helmet>
        <title>MetaBeys – Competitive Beyblade X Analytics</title>
        <meta
          name="description"
          content="MetaBeys is the competitive operating system for Beyblade X: tournaments, rankings, meta analytics, and store discovery."
        />
        <meta property="og:title" content="MetaBeys – Competitive Beyblade X Analytics" />
        <meta property="og:description" content="Tournaments, meta trends, rankings, and the fastest way to build for top cut." />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="/favicon.png" />
      </Helmet>

      <div className="min-h-screen text-white relative">
        <UltraBG />

        {/* Top ribbon */}
        <div className="relative z-20">
          <div className="border-b border-white/10 bg-white/[0.03] backdrop-blur">
            <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  Open Beta
                </span>
                <span className="hidden sm:inline text-white/40">•</span>
                <span className="text-white/80">Stores onboard free</span>
                <span className="hidden sm:inline text-white/40">•</span>
                <Link to="/contact" className="underline underline-offset-4 text-cyan-200 hover:text-cyan-100">
                  Talk to us
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/user-auth"
                  className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition text-sm"
                >
                  Create account
                </Link>
                <Link
                  to="/home"
                  className="px-4 py-2 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition text-sm inline-flex items-center gap-2"
                >
                  Enter MetaBeys <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <section className="relative z-10 px-6 pt-14 sm:pt-18 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left */}
              <div className="lg:col-span-7">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm text-white/80"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-200" />
                  Trusted tournament data • Built for competitive play
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.65 }}
                  className="mt-5 font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl"
                >
                  Competitive Beyblade X,
                  <span className="block">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-cyan-200 to-fuchsia-200">
                      finally organized.
                    </span>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: 0.6 }}
                  className="mt-5 text-white/70 text-base sm:text-lg max-w-2xl"
                >
                  The platform for tournaments, rankings, and meta analytics. Find events near you, see what’s winning, and build
                  smarter from real Top Cut history.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.6 }}
                  className="mt-7 flex flex-col sm:flex-row gap-3"
                >
                  <Link
                    to="/home"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-3 font-semibold hover:bg-white/90 transition"
                  >
                    Enter MetaBeys
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-black/10 group-hover:bg-black/15 transition">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>

                  <Link
                    to="/events"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10 transition"
                  >
                    Browse events <ChevronRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                {/* Quick proof chips */}
                <div className="mt-8 flex flex-wrap gap-2">
                  <ProofChip icon={<Radar className="w-4 h-4" />} text="Live meta snapshots" />
                  <ProofChip icon={<Trophy className="w-4 h-4" />} text="Top Cut–driven rankings" />
                  <ProofChip icon={<Globe2 className="w-4 h-4" />} text="North America coverage" />
                  <ProofChip icon={<Zap className="w-4 h-4" />} text="Fast, filterable discovery" />
                </div>
              </div>

              {/* Right: “glass console” */}
              <div className="lg:col-span-5">
                <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} glareEnable glareMaxOpacity={0.15} className="rounded-3xl">
                  <div className="rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      </div>
                      <div className="text-xs text-white/60">Meta Console</div>
                      <div className="text-xs text-white/60">{timeframeLabel(timeframe)}</div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <MiniStat icon={<Trophy className="w-4 h-4" />} label="Appearances" value={comboCount} />
                        <MiniStat icon={<CalendarDays className="w-4 h-4" />} label="Events" value={eventCount} />
                        <MiniStat icon={<MapPin className="w-4 h-4" />} label="Stores" value={storeCount} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white/85">Top meta combos</div>
                        <TimeframePill value={timeframe} onChange={setTimeframe} />
                      </div>

                      <div className="space-y-3">
                        {topCombos.length === 0 ? (
                          <div className="space-y-3">
                            <div className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                            <div className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                            <div className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                          </div>
                        ) : (
                          topCombos.map((c, i) => (
                            <MetaRow
                              key={i}
                              rank={i + 1}
                              title={`${c.blade}`}
                              sub={`${c.ratchet} • ${c.bit}`}
                              right={`${c.appearances} / ${c.eventCount}`}
                              href={`/leaderboard?blade=${encodeURIComponent(c.blade)}`}
                            />
                          ))
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/12 bg-gradient-to-r from-white/6 to-white/[0.02] p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-cyan-200">
                            <BadgeCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold">Built for organizers too</div>
                            <div className="text-sm text-white/65 mt-1">
                              Clean event pages, discoverability, and a real record of your local meta.
                            </div>
                            <Link to="/contact" className="inline-flex items-center gap-2 mt-3 text-sm text-cyan-200 hover:text-cyan-100">
                              Onboard your store <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tilt>
              </div>
            </div>

            {/* Upcoming strip */}
            {upcoming.length > 0 && (
              <div className="mt-10 rounded-3xl border border-white/12 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="w-4 h-4 text-cyan-200" />
                    Upcoming events
                  </div>
                  <Link to="/events" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-2">
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <Marquee pauseOnHover gradient={false} speed={34} className="py-4">
                  {upcoming.map((e, idx) => (
                    <div key={String(e.id) + idx} className="mx-8 flex items-center gap-3 text-sm">
                      <span className="text-white/70">{fmtDate(e.startTime || e.date || 0)}</span>
                      <span className="font-semibold">{e.title}</span>
                      <span className="text-white/60">
                        {[e.city, e.region].filter(Boolean).join(", ") || e.store || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/70">
                        <MapPin className="w-3.5 h-3.5" />
                        {e.country || "NA"}
                      </span>
                    </div>
                  ))}
                </Marquee>
              </div>
            )}
          </div>
        </section>

        {/* Partner marquee */}
        <section className="relative z-10 px-6 pb-10">
          <div className="max-w-7xl mx-auto rounded-3xl border border-white/12 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="text-sm font-semibold">Partners</div>
              <div className="text-xs text-white/60">Stores & organizers across North America</div>
            </div>
            <div className="py-4">
              <Marquee pauseOnHover gradient={false} speed={36}>
                {storeNames.length === 0 ? (
                  <div className="text-white/60 mx-8">Loading…</div>
                ) : (
                  storeNames.map((n, i) => (
                    <div
                      key={i}
                      className="mx-8 text-sm text-white/75 hover:text-white transition inline-flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      {n}
                    </div>
                  ))
                )}
              </Marquee>
            </div>
          </div>
        </section>

        {/* Bento feature grid */}
        <section className="relative z-10 px-6 py-14">
          <div className="max-w-7xl mx-auto">
            <HeaderKicker
              kicker="Platform"
              title="Everything you need to compete (and host)"
              sub="Modern tooling for discovery, analytics, and the competitive loop."
            />

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <BentoCard className="lg:col-span-5" title="Rankings that actually matter" icon={<Trophy className="w-5 h-5" />}>
                Live leaderboards driven by real Top Cut history. Filter by parts, see context, and track evolution over time.
                <BentoCTA to="/leaderboard" label="Open leaderboard" />
              </BentoCard>

              <BentoCard className="lg:col-span-7" title="Tournament discovery, upgraded" icon={<CalendarDays className="w-5 h-5" />}>
                Find events by city, store, and date. A clean event page people actually want to share.
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Pill icon={<MapPin className="w-4 h-4" />} text="Location filters" />
                  <Pill icon={<ShieldCheck className="w-4 h-4" />} text="Verified stores" />
                  <Pill icon={<Sparkles className="w-4 h-4" />} text="Clean share cards" />
                </div>
                <BentoCTA to="/events" label="Browse events" />
              </BentoCard>

              <BentoCard className="lg:col-span-7" title="Meta analytics, not guesses" icon={<BarChart3 className="w-5 h-5" />}>
                See what’s trending, what’s stable, and what’s spiking. Make changes based on evidence, not vibes.
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MiniFeature icon={<Radar className="w-4 h-4" />} title="Trend pulses" desc="Surface what’s rising fast." />
                  <MiniFeature icon={<Swords className="w-4 h-4" />} title="Match insights" desc="Understand patterns across builds." />
                </div>
                <BentoCTA to="/tournament-lab" label="Open Tournament Lab" />
              </BentoCard>

              <BentoCard className="lg:col-span-5" title="Store Finder" icon={<Globe2 className="w-5 h-5" />}>
                Discover shops hosting events, browse by region, and build the local scene faster.
                <BentoCTA to="/stores" label="Find stores" />
              </BentoCard>
            </div>
          </div>
        </section>

        {/* Metrics band */}
        <section className="relative z-10 px-6 py-12">
          <div className="max-w-7xl mx-auto rounded-[2rem] border border-white/12 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60">Momentum</div>
                  <div className="mt-2 text-3xl sm:text-4xl font-extrabold">
                    Built with the community. Scaling fast.
                  </div>
                  <div className="mt-2 text-white/65 max-w-2xl">
                    Every event logged makes the meta sharper. Every store listed makes discovery easier.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Timeframe</span>
                  <TimeframePill value={timeframe} onChange={setTimeframe} />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <BigStat icon={<Trophy className="w-5 h-5" />} label="Top-cut appearances" value={comboCount} />
                <BigStat icon={<CalendarDays className="w-5 h-5" />} label="Events logged" value={eventCount} />
                <BigStat icon={<MapPin className="w-5 h-5" />} label="Stores listed" value={storeCount} />
              </div>
            </div>
          </div>
        </section>

        {/* “How it works” */}
        <section className="relative z-10 px-6 py-14">
          <div className="max-w-7xl mx-auto">
            <HeaderKicker
              kicker="Workflow"
              title="From event → to insight → to wins"
              sub="A clean loop that makes improvement automatic."
            />

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StepCard
                n="01"
                icon={<CalendarDays className="w-5 h-5" />}
                title="Events get logged"
                desc="Organizers submit results, Top Cut combos, and context."
              />
              <StepCard
                n="02"
                icon={<BarChart3 className="w-5 h-5" />}
                title="Meta gets computed"
                desc="Rankings and trends update as new tournaments land."
              />
              <StepCard
                n="03"
                icon={<Swords className="w-5 h-5" />}
                title="You build smarter"
                desc="Use real-world history to decide your next changes."
              />
            </div>
          </div>
        </section>

        {/* CTA finale */}
        <section className="relative z-10 px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-[2.2rem] border border-white/12 bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,0.18)_0%,transparent_55%),radial-gradient(65%_65%_at_70%_60%,rgba(99,102,241,0.18)_0%,transparent_60%)] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/75">
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    Ready when you are
                  </div>
                  <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold">
                    Join MetaBeys and lock in your edge.
                  </h3>
                  <p className="mt-3 text-white/65 max-w-2xl">
                    Browse events. Study winners. Track the meta. If you run a store, get listed and get discovered by local bladers.
                  </p>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/user-auth"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-3 font-semibold hover:bg-white/90 transition"
                    >
                      Create free account <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10 transition"
                    >
                      Onboard a store <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="mt-6 text-xs text-white/55">
                    © {new Date().getFullYear()} MetaBeys. Built by @Aysus & @Karl6ix.
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="grid grid-cols-1 gap-4">
                    <GlassBadge title="Fast discovery" sub="Find events & stores instantly." icon={<Zap className="w-5 h-5" />} />
                    <GlassBadge title="Evidence-based meta" sub="Top Cut history drives decisions." icon={<BadgeCheck className="w-5 h-5" />} />
                    <GlassBadge title="Community-first" sub="Built for players and organizers." icon={<ShieldCheck className="w-5 h-5" />} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

/* =========================
   UI Bits
   ========================= */

function timeframeLabel(t: Timeframe) {
  if (t === "year") return "Past year"
  if (t === "month") return "Past month"
  if (t === "week") return "Past week"
  return "All time"
}

function ProofChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/75 hover:bg-white/10 transition">
      <span className="text-cyan-200">{icon}</span>
      {text}
    </span>
  )
}

function HeaderKicker({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs uppercase tracking-wider text-white/55">{kicker}</div>
      <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold">{title}</h2>
      {sub && <p className="mt-3 text-white/65">{sub}</p>}
    </div>
  )
}

function TimeframePill({ value, onChange }: { value: Timeframe; onChange: (v: Timeframe) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 p-1">
      {([
        ["all", "All"],
        ["year", "Year"],
        ["month", "Month"],
        ["week", "Week"],
      ] as Array<[Timeframe, string]>).map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={
            "px-3 py-1.5 text-xs rounded-full transition " +
            (value === v ? "bg-white text-black font-semibold" : "text-white/70 hover:text-white")
          }
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div className="text-white/70">{icon}</div>
        <div className="text-xs text-white/50">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold">
        <CountUp end={value || 0} duration={1.0} separator="," />
      </div>
    </div>
  )
}

function MetaRow({
  rank,
  title,
  sub,
  right,
  href,
}: {
  rank: number
  title: string
  sub: string
  right: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.03] hover:bg-white/[0.06] transition p-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center font-extrabold text-white/85">
          {rank}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{title}</div>
          <div className="text-xs text-white/55 truncate">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-white/55 tabular-nums">{right}</div>
        <ArrowRight className="w-4 h-4 text-white/55 group-hover:text-white transition" />
      </div>
    </Link>
  )
}

function BentoCard({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} className={className || ""}>
      <div className="h-full rounded-[1.75rem] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-6 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_25px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2 text-white/80">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-white/12 bg-white/5 text-cyan-200">
            {icon}
          </span>
          <div className="text-lg font-extrabold">{title}</div>
        </div>
        <div className="mt-4 text-white/65">{children}</div>
      </div>
    </Tilt>
  )
}

function BentoCTA({ to, label }: { to: string; label: string }) {
  return (
    <div className="mt-6">
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
      >
        {label} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/75 flex items-center gap-2">
      <span className="text-indigo-200">{icon}</span>
      {text}
    </div>
  )
}

function MiniFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/85 font-semibold">
        <span className="text-fuchsia-200">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-sm text-white/60">{desc}</div>
    </div>
  )
}

function BigStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between text-white/70">
        <div className="inline-flex items-center gap-2">
          <span className="text-cyan-200">{icon}</span>
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-xs text-white/50">Live</span>
      </div>
      <div className="mt-4 text-4xl font-extrabold tabular-nums">
        <CountUp end={value || 0} duration={1.15} separator="," />
        <span className="text-white/35 ml-1">+</span>
      </div>
    </div>
  )
}

function StepCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_25px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55 font-semibold">{n}</div>
        <div className="w-10 h-10 rounded-2xl border border-white/12 bg-white/5 flex items-center justify-center text-indigo-200">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-lg font-extrabold">{title}</div>
      <div className="mt-2 text-white/65">{desc}</div>
    </div>
  )
}

function GlassBadge({ title, sub, icon }: { title: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl border border-white/12 bg-white/5 flex items-center justify-center text-cyan-200">
          {icon}
        </div>
        <div>
          <div className="font-extrabold">{title}</div>
          <div className="text-sm text-white/65">{sub}</div>
        </div>
      </div>
    </div>
  )
}
