import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import CountUp from "react-countup"
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Sparkles,
  Trophy,
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
}

interface Store {
  id: number | string
  name: string
  city?: string
  region?: string
  country?: string
}

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ")
const fmtDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

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
      <div className="absolute inset-0 bg-[#070A12]" />

      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_35%,rgba(99,102,241,0.20)_0%,transparent_55%),radial-gradient(55%_55%_at_75%_65%,rgba(34,211,238,0.14)_0%,transparent_60%),radial-gradient(55%_55%_at_25%_70%,rgba(168,85,247,0.12)_0%,transparent_62%)]" />

      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
        style={{
          left: x,
          top: y,
          background:
            "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.45) 0%, rgba(99,102,241,0.22) 38%, transparent 70%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.55'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}

function TypewriterText({
  words,
  typingSpeed = 85,
  deletingSpeed = 45,
  pauseMs = 1400,
}: {
  words: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseMs?: number
}) {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex] || ""

    const timeout = window.setTimeout(() => {
      if (!isDeleting) {
        const next = currentWord.slice(0, displayText.length + 1)
        setDisplayText(next)

        if (next === currentWord) {
          window.setTimeout(() => setIsDeleting(true), pauseMs)
        }
      } else {
        const next = currentWord.slice(0, Math.max(0, displayText.length - 1))
        setDisplayText(next)

        if (next === "") {
          setIsDeleting(false)
          setWordIndex(prev => (prev + 1) % words.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => window.clearTimeout(timeout)
  }, [displayText, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseMs])

  return (
    <span className="inline-flex items-center justify-center">
      <span className="text-transparent bg-gradient-to-r from-indigo-200 via-cyan-200 to-fuchsia-200 bg-clip-text">
        {displayText}
      </span>
      <span className="ml-1 inline-block h-[0.9em] w-[2px] animate-pulse bg-cyan-200" />
    </span>
  )
}

export default function Landing() {
  const [comboCount, setComboCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [storeCount, setStoreCount] = useState(0)
  const [topCombos, setTopCombos] = useState<Array<Combo & { appearances: number; eventCount: number }>>([])
  const [upcoming, setUpcoming] = useState<EventItem[]>([])
  const [timeframe] = useState<Timeframe>("all")

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

        setStoreCount((storesData || []).length)

        const upcomingList = (eventsData || [])
          .filter(e => new Date(e.startTime || e.date || 0) >= now)
          .sort((a, b) => new Date(a.startTime || a.date || 0).getTime() - new Date(b.startTime || b.date || 0).getTime())
          .slice(0, 6)

        setUpcoming(upcomingList)

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

  return (
    <>
      <Helmet>
        <title>MetaBeys – Competitive Beyblade X Analytics</title>
        <meta
          name="description"
          content="MetaBeys is the premium home for Beyblade X tournaments, rankings, store discovery, and meta analytics."
        />
        <meta property="og:title" content="MetaBeys – Competitive Beyblade X Analytics" />
        <meta
          property="og:description"
          content="Track the meta, find events, and build smarter with real top-cut history."
        />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="/beymeta.png" />
      </Helmet>

      <div className="relative min-h-screen overflow-hidden text-white">
        <UltraBG />

        <div className="relative z-20 border-b border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-white/80 sm:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Open Beta
              </span>
              <span className="hidden text-white/40 sm:inline">•</span>
              <span className="text-white/80">Stores onboard free</span>
              <span className="hidden text-white/40 sm:inline">•</span>
              <Link to="/contact" className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100">
                Talk to us
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/user-auth"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
              >
                Create account
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Enter MetaBeys <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <section className="relative z-10 overflow-hidden px-6 pb-10 pt-16 md:pt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 isolate hidden opacity-50 lg:block"
          >
            <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[22rem] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
            <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
            <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[22rem] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.6 }}
                className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
              >
                MetaBeys, your source for
                <span className="mt-2 block min-h-[1.25em]">
                  <TypewriterText
                    words={[
                      "Meta Snapshots",
                      "Finding Stores",
                      "Tournament Discovery",
                      "Top Cut Rankings",
                      "Winning Trends",
                    ]}
                  />
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.6 }}
                className="mx-auto my-8 max-w-2xl text-lg text-white/70 sm:text-xl"
              >
    
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.6 }}
                className="flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Link
                  to="/home"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90"
                >
                  Enter MetaBeys <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/events/completed"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10"
                >
                  Browse events <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>

            <div className="mx-auto -mt-2 max-w-7xl [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)] md:-mt-8">
              <div className="[perspective:1200px] [mask-image:linear-gradient(to_right,black_82%,transparent_100%)] -mr-8 pl-8 lg:-mr-36 lg:pl-36">
                <div className="[transform:rotateX(20deg);]">
                  <div className="relative lg:h-[44rem] skew-x-[.24rad]">
                    <img
                      src="/beymeta.png"
                      alt="MetaBeys platform preview"
                      className="relative z-[2] rounded-[28px] border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_80px_rgba(0,0,0,0.55)]"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {topCombos.length > 0 && (
          <section className="relative z-10 px-6 pb-10">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Live Meta</div>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Top 3 Meta Combos Right Now</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {topCombos.map((c, i) => (
                  <Link
                    key={i}
                    to={`/leaderboard?blade=${encodeURIComponent(c.blade)}`}
                    className="group overflow-hidden rounded-3xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-bold text-white/85">
                        {i + 1}
                      </div>
                      <div className="text-xs tabular-nums text-white/50">
                        {c.appearances} apps · {c.eventCount} events
                      </div>
                    </div>

                    <div className="mt-5 text-xl font-semibold">{c.blade}</div>
                    <div className="mt-2 text-white/60">
                      {c.ratchet} • {c.bit}
                    </div>

                    <div className="mt-5 h-px w-full bg-white/10" />

                    <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 group-hover:text-cyan-100">
                      View leaderboard <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="relative z-10 px-6 pb-10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard icon={<Trophy className="h-5 w-5" />} label="Top-cut appearances" value={comboCount} />
            <MetricCard icon={<CalendarDays className="h-5 w-5" />} label="Events logged" value={eventCount} />
            <MetricCard icon={<MapPin className="h-5 w-5" />} label="Stores listed" value={storeCount} />
          </div>
        </section>

        {upcoming.length > 0 && (
          <section className="relative z-10 px-6 pb-12">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/12 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">Upcoming</div>
                  <h3 className="mt-1 text-xl font-semibold">What’s happening next</h3>
                </div>
                <Link to="/events" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {upcoming.slice(0, 3).map(e => (
                  <Link
                    key={e.id}
                    to="/events"
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div className="text-sm text-white/50">{fmtDate(e.startTime || e.date || 0)}</div>
                    <div className="mt-2 font-semibold">{e.title}</div>
                    <div className="mt-2 text-sm text-white/60">
                      {[e.city, e.region].filter(Boolean).join(", ") || e.store || "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-cyan-200">{icon}</div>
        <div className="text-xs text-white/50">{label}</div>
      </div>
      <div className="mt-3 text-3xl font-extrabold">
        <CountUp end={value || 0} duration={1.0} separator="," />
      </div>
    </div>
  )
}