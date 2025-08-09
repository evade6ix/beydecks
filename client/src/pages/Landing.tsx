import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { motion, useScroll, useTransform } from "framer-motion"
import { Helmet } from "react-helmet-async"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination, Autoplay } from "swiper/modules"
import CountUp from "react-countup"
import Marquee from "react-fast-marquee"
import Tilt from "react-parallax-tilt"
import {
  Trophy,
  CalendarCheck,
  PieChart,
  ShoppingCart,
  MapPin,
  Swords,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import "swiper/css"
import "swiper/css/pagination"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

type Timeframe = "all" | "year" | "month" | "week"

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
}
interface Player { name: string; combos: Combo[] }
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
interface Store { id: number | string; name: string; city?: string; region?: string; country?: string; logo?: string }

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ")

/* =========================
   Constellation Background
   ========================= */
function ConstellationBG({
  dotColor = "rgba(199,210,254,0.8)",    // indigo-200
  linkColor = "rgba(56,189,248,0.35)",  // cyan-400
  maxDist = 135,
  density = 0.00008,
  speed = 0.08,
}: {
  dotColor?: string
  linkColor?: string
  maxDist?: number
  density?: number
  speed?: number
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext("2d")!
    let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1)
    let particles: { x:number; y:number; vx:number; vy:number }[] = []
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    function resize() {
      const parent = canvas.parentElement || document.body
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + "px"
      canvas.style.height = h + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const area = w * h
      const target = Math.floor(area * density)
      if (particles.length > target) particles.length = target
      while (particles.length < target) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() * 2 - 1) * speed,
          vy: (Math.random() * 2 - 1) * speed,
        })
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h)

      // move
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20
      }

      // links
      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.hypot(dx, dy)
          if (dist < maxDist) {
            const alpha = 1 - dist / maxDist
            ctx.strokeStyle = linkColor.replace(/[\d.]+\)$/, alpha.toFixed(3) + ")")
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
      }

      // dots
      ctx.fillStyle = dotColor
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      raf.current = requestAnimationFrame(step)
    }

    resize()
    if (!reduced) raf.current = requestAnimationFrame(step)
    const onResize = () => resize()
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [density, linkColor, dotColor, maxDist, speed])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60"
      style={{ filter: "drop-shadow(0 0 2px rgba(56,189,248,0.15))" }}
    />
  )
}

// ---------- PAGE ----------
export default function Landing() {
  const [comboCount, setComboCount] = useState(0) // now "top-cut appearances"
  const [eventCount, setEventCount] = useState(0)
  const [storeCount, setStoreCount] = useState(0)
  const [topCombos, setTopCombos] = useState<Array<Combo & { appearances: number; eventCount: number }>>([])
  const [upcoming, setUpcoming] = useState<EventItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>("all")

  // Parallax for background blobs
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 600], [0, 120])
  const y2 = useTransform(scrollY, [0, 600], [0, -80])

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch(`${API}/events`).then(r => r.json()),
      fetch(`${API}/stores`).then(r => r.json()),
    ])
      .then(([eventsData, storesData]: [EventItem[], Store[]]) => {
        if (!mounted) return
        const now = new Date()
        const windowStart = (() => {
          if (timeframe === "year") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          if (timeframe === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          if (timeframe === "week") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          return new Date(0)
        })()

        // Filter events by timeframe
        const filtered = (eventsData || []).filter(e => {
          const d = new Date(e.startTime || e.date || 0)
          return d >= windowStart
        })

        setEventCount(filtered.length)
        setStores(storesData || [])
        setStoreCount((storesData || []).length)

        // Upcoming (next 30 days)
        const upcomingList = (eventsData || [])
          .filter(e => new Date(e.startTime || e.date || 0) >= now)
          .sort((a, b) => new Date(a.startTime || a.date || 0).getTime() - new Date(b.startTime || b.date || 0).getTime())
          .slice(0, 20)
        setUpcoming(upcomingList)

        // ----- Top combos aggregation (appearances + unique events) -----
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

        // Ensure no part overlaps between featured trio
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
        setComboCount(totalAppearances) // big stat = total top-cut appearances in timeframe
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [timeframe])

  const storeNames = useMemo(() => (stores || []).map(s => s.name).filter(Boolean).slice(0, 30), [stores])

  return (
    <>
      <Helmet>
        <title>MetaBeys – Competitive Beyblade X Analytics</title>
        <meta name="description" content="Track Beyblade X tournaments, meta combos, and more. The #1 platform for competitive Bladers." />
        <meta property="og:title" content="MetaBeys – Competitive Beyblade X Analytics" />
        <meta property="og:description" content="Join the competitive Beyblade X scene. Track events, top combos, and buy from trusted stores." />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="/favicon.png" />
      </Helmet>

      {/* PAGE WRAPPER */}
      <div className="min-h-screen bg-[#0b1020] text-white relative overflow-hidden">
        {/* Constellation network */}
        <ConstellationBG />

        {/* Aurora blobs with parallax */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 w-[55rem] h-[55rem] rounded-full blur-3xl opacity-25"
          style={{ y: y1, background: "radial-gradient(closest-side, #5b9cff 0%, transparent 60%)" }}
          animate={{ x: [0, 40, -30, 0], y: [0, -20, 10, 0], scale: [1, 1.05, 0.98, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -right-48 w-[60rem] h-[60rem] rounded-full blur-3xl opacity-25"
          style={{ y: y2, background: "radial-gradient(closest-side, #8b5cf6 0%, transparent 60%)" }}
          animate={{ x: [0, -50, 30, 0], y: [0, 25, -15, 0], scale: [1, 0.97, 1.03, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 45%, rgba(91,156,255,0.35) 0%, transparent 55%), radial-gradient(50% 50% at 70% 60%, rgba(139,92,246,0.35) 0%, transparent 60%)",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
        <div aria-hidden className="absolute inset-0 mix-blend-soft-light opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.35'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* NAV CTA RIBBON */}
        <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-2 text-xs sm:text-sm flex items-center gap-2 justify-center">
            <Sparkles className="w-4 h-4" />
            <span className="opacity-90">Open Beta</span>
            <span className="opacity-60">·</span>
            <span className="opacity-90">Stores onboard free</span>
            <Link to="/contact" className="ml-3 underline text-accent">Contact Us</Link>
          </div>
        </div>

        {/* HERO (CENTERED) */}
        <section className="relative px-6 pt-20 pb-16 sm:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.img
              src="/logos/logoclear.png"
              alt="MetaBeys Logo"
              className="h-20 sm:h-24 md:h-28 mx-auto drop-shadow-xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            />

            <motion.h1
              className="mt-6 leading-tight font-extrabold text-4xl sm:text-5xl md:text-6xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              The analytics home of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-cyan-300">
                Beyblade X Tournaments
              </span>
            </motion.h1>

            <motion.p
              className="mt-4 text-neutral-200 max-w-2xl mx-auto text-base sm:text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Track events, dissect meta trends, and shop the exact parts top players use. Built for serious bladers and event organizers.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link to="/home" className="btn btn-primary btn-lg gap-2">
                Enter MetaBeys <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/user-auth" className="btn btn-outline btn-lg">
                Create free account
              </Link>
            </motion.div>

            {/* Upcoming events ticker */}
            {upcoming.length > 0 && (
              <div className="mt-10 rounded-xl border border-white/10 bg-white/5">
                <div className="px-4 py-2 text-xs uppercase tracking-wider text-neutral-300 border-b border-white/10 flex items-center justify-center gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  Upcoming events
                </div>
                <Marquee pauseOnHover gradient={false} speed={36} className="py-3">
                  {upcoming.map((e, idx) => (
                    <div key={String(e.id) + idx} className="mx-6 flex items-center gap-3 opacity-90">
                      <span className="text-indigo-300 text-xs">{new Date(e.startTime || e.date || 0).toLocaleDateString()}</span>
                      <span className="font-medium">{e.title}</span>
                      <span className="text-neutral-300 text-sm">{[e.city, e.region].filter(Boolean).join(", ")}</span>
                      <Link to="/events" className="text-accent underline underline-offset-2">View</Link>
                    </div>
                  ))}
                </Marquee>
              </div>
            )}
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="px-6 pb-14">
          <div className="max-w-7xl mx-auto rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-center text-sm text-neutral-200 mb-2">Trusted by stores and organizers across North America</div>
            <Marquee pauseOnHover gradient={false} speed={36}>
              {storeNames.length === 0 ? (
                <div className="text-neutral-300">Loading partners…</div>
              ) : (
                storeNames.map((n, i) => (
                  <div key={i} className="mx-6 opacity-90 hover:opacity-100 transition-opacity">{n}</div>
                ))
              )}
            </Marquee>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <SectionTitle title="What you can do" subtitle="Competitive features built for serious bladers" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              <FeatureCard icon={<Trophy className="w-6 h-6" />} title="Meta Leaderboard" desc="Live rankings of top Blades, Ratchets, and Bits from real events." />
              <FeatureCard icon={<CalendarCheck className="w-6 h-6" />} title="Tournaments" desc="Find upcoming locals & regionals. Filter by city, store, or date." />
              <FeatureCard icon={<PieChart className="w-6 h-6" />} title="Combo Analytics" desc="Analyze top-cut trends, matchup patterns, and combo prevalence." />
              <FeatureCard icon={<ShoppingCart className="w-6 h-6" />} title="Shop Integration (Coming Soon)" desc="Buy the exact parts used in top decks from verified vendors." />
              <FeatureCard icon={<MapPin className="w-6 h-6" />} title="Store Finder" desc="Browse curated stores hosting Beyblade events in your region." />
              <FeatureCard icon={<Swords className="w-6 h-6" />} title="Tournament Lab" desc="Simulate how your build would stack up based on meta history." />
            </div>
          </div>
        </section>

        {/* TOP COMBOS with timeframe filter */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <SectionTitle title="Top Performing Meta Combos" subtitle="Proven by real tournament data" />
              <TimeframeSelect value={timeframe} onChange={setTimeframe} />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topCombos.length === 0 ? (
                <SkeletonCard repeat={3} />
              ) : (
                topCombos.map((c, i) => (
                  <Tilt key={i} tiltMaxAngleX={6} tiltMaxAngleY={6} className="bg-white rounded-xl shadow p-6 text-center">
                    <div className="text-xs uppercase tracking-wide text-indigo-700 font-semibold">#{i + 1} Meta Pick</div>
                    <div className="mt-1 text-2xl font-extrabold text-gray-900">{c.blade}</div>
                    <div className="text-gray-700">{c.ratchet} • {c.bit}</div>
                    <div className="mt-2 text-sm text-gray-700">
                      {c.appearances} top-cut appearances
                      <span className="text-gray-500"> · {c.eventCount} events</span>
                    </div>
                    <div className="mt-4 flex justify-center gap-2">
                      <Link to={`/leaderboard?blade=${encodeURIComponent(c.blade)}`} className="btn btn-sm btn-primary">
                        See usage
                      </Link>
                      <Link to="/tournament-lab" className="btn btn-sm bg-gray-900 text-white hover:bg-gray-800 border-gray-900">
                        Test in Lab
                      </Link>
                    </div>
                  </Tilt>
                ))
              )}
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="py-16 bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white px-6">
          <div className="max-w-7xl mx-auto">
            <SectionTitle title="MetaBeys in numbers" subtitle="Growing with the community" invert />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard label="Top-cut appearances" value={comboCount} suffix="+" />
              <StatCard label="Events logged" value={eventCount} suffix="+" />
              <StatCard label="Stores listed" value={storeCount} suffix="+" />
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="bg-white text-gray-900 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <SectionTitle title="Loved by players & stores" subtitle="Real feedback from the community" centerOnLight />
            <div className="max-w-3xl mx-auto mt-8">
              <Swiper modules={[Autoplay, Pagination]} autoplay={{ delay: 5000 }} pagination={{ clickable: true }} loop spaceBetween={24}>
                {[
                  { q: "I used MetaBeys to build and won my first tournament.", a: "Competitive Player" },
                  { q: "Filtering by location is insanely helpful for locals & meta building.", a: "Regional Champion" },
                  { q: "Our store uploads every event here. It’s streamlined and professional.", a: "Store Owner" },
                  { q: "Great for teaching new players using real Top Cut history.", a: "Event Organizer" },
                ].map((t, i) => (
                  <SwiperSlide key={i}>
                    <blockquote className="bg-gray-100 p-6 rounded-xl shadow text-left">
                      <p className="text-lg font-medium mb-2">“{t.q}”</p>
                      <span className="text-sm text-gray-600">– {t.a}</span>
                    </blockquote>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center py-10 text-neutral-300 text-sm">
          © {new Date().getFullYear()} MetaBeys. Built by @Aysus & @Karl6ix.
        </footer>
      </div>
    </>
  )
}

/* ---------- Subcomponents ---------- */

function SectionTitle({
  title, subtitle, invert, centerOnLight,
}: { title: string; subtitle?: string; invert?: boolean; centerOnLight?: boolean }) {
  const titleCls = invert
    ? "text-white"
    : centerOnLight
    ? "text-gray-900"
    : "text-white"
  const subCls = invert
    ? "text-white/80"
    : centerOnLight
    ? "text-gray-600"
    : "text-neutral-200"
  return (
    <div className={(centerOnLight ? "mx-auto text-center " : "") + "max-w-3xl"}>
      <h2 className={`${titleCls} text-3xl sm:text-4xl font-extrabold`}>{title}</h2>
      {subtitle && <p className={`${subCls} mt-2`}>{subtitle}</p>}
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} className="p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500/40 to-cyan-500/30">
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition text-left">
        <div className="flex items-center gap-3 text-indigo-700 font-semibold">{icon}<span>{title}</span></div>
        <p className="mt-2 text-gray-700 text-sm leading-relaxed">{desc}</p>
      </div>
    </Tilt>
  )
}

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl p-6 border border-white/15 bg-white/5">
      <div className="text-4xl font-extrabold"><CountUp end={value || 0} duration={1.2} separator="," />{suffix}</div>
      <div className="text-sm text-neutral-200 mt-1">{label}</div>
    </div>
  )
}

function TimeframeSelect({ value, onChange }: { value: Timeframe; onChange: (v: Timeframe) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-neutral-200">View</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as Timeframe)}
        className="select select-sm select-bordered bg-white text-gray-900"
      >
        <option value="all">All Time</option>
        <option value="year">Past Year</option>
        <option value="month">Past Month</option>
        <option value="week">Past Week</option>
      </select>
    </div>
  )
}

function SkeletonCard({ repeat = 1 }: { repeat?: number }) {
  return (
    <>
      {Array.from({ length: repeat }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-6 min-h-[120px]" />
      ))}
    </>
  )
}
