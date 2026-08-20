import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Compass,
  FlaskConical,
  MapPin,
  Search,
  Sparkles,
  Store as StoreIcon,
  Trophy,
  Users,
  Zap,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
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
  attendeeCount?: number
  topCutCount?: number
  winner?: string
}

type TopCombo = Combo & { appearances: number; eventCount: number }

interface LandingSnapshot {
  stats: {
    comboCount: number
    eventCount: number
    storeCount: number
  }
  topCombos: TopCombo[]
  recentResults: EventItem[]
}

const fmtDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const fmtMonth = (date: string | number | Date) =>
  new Date(date).toLocaleDateString(undefined, { month: "short" }).toUpperCase()

const fmtDay = (date: string | number | Date) =>
  new Date(date).toLocaleDateString(undefined, { day: "2-digit" })

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const },
}

export default function Landing() {
  const [comboCount, setComboCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [storeCount, setStoreCount] = useState(0)
  const [topCombos, setTopCombos] = useState<TopCombo[]>([])
  const [recentResults, setRecentResults] = useState<EventItem[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSceneData() {
      try {
        const response = await fetch(`${API}/landing-data`, { signal: controller.signal })
        if (!response.ok) throw new Error("Scene data unavailable")

        const snapshot = (await response.json()) as LandingSnapshot
        setComboCount(Number(snapshot.stats?.comboCount || 0))
        setEventCount(Number(snapshot.stats?.eventCount || 0))
        setStoreCount(Number(snapshot.stats?.storeCount || 0))
        setTopCombos(Array.isArray(snapshot.topCombos) ? snapshot.topCombos : [])
        setRecentResults(Array.isArray(snapshot.recentResults) ? snapshot.recentResults : [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      } finally {
        if (!controller.signal.aborted) setDataLoaded(true)
      }
    }

    loadSceneData()
    return () => controller.abort()
  }, [])

  const liveLabel = comboCount
    ? `${comboCount.toLocaleString()} top-cut combinations indexed`
    : "Competitive Beyblade X intelligence"

  return (
    <>
      <Helmet>
        <title>MetaBeys — The Competitive Edge for Beyblade X</title>
        <meta
          name="description"
          content="Read the Beyblade X meta, explore verified tournament history, research players and parts, and build with real competitive data."
        />
        <meta name="theme-color" content="#ffffff" />
        <meta property="og:title" content="MetaBeys — The Competitive Edge for Beyblade X" />
        <meta
          property="og:description"
          content="Real tournament data. Clear meta signals. Better Beyblade X decisions."
        />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="https://www.metabeys.com/beymeta.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen overflow-hidden bg-[#fbfbf8] text-[#121316] selection:bg-[#b9ccff] selection:text-black">
        {/* LIVE SIGNAL */}
        <div className="relative z-50 bg-[#121316] text-white">
          <div className="mx-auto flex min-h-9 max-w-[1440px] items-center justify-center gap-2 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7cf7c4] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7cf7c4]" />
            </span>
            {liveLabel}
            <span className="hidden text-white/30 sm:inline">•</span>
            <Link to="/events/completed" className="hidden text-[#b9ccff] transition hover:text-white sm:inline">
              Explore the latest results →
            </Link>
          </div>
        </div>

        {/* NAVIGATION */}
        <header className="relative z-40 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link to="/" className="group flex items-center gap-3" aria-label="MetaBeys landing page">
              <span className="flex h-10 w-[54px] items-center justify-center overflow-hidden rounded-xl bg-[#121316] px-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition group-hover:-rotate-2 group-hover:scale-[1.03]">
                <img src="/logolargestsolo.png" alt="" className="w-full object-contain" />
              </span>
              <span className="text-lg font-black tracking-[-0.04em] text-[#121316]">METABEYS</span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold text-black/60 lg:flex" aria-label="Main navigation">
              <a href="#live-meta" className="transition hover:text-black">Live meta</a>
              <a href="#platform" className="transition hover:text-black">Platform</a>
              <a href="#results" className="transition hover:text-black">Latest results</a>
              <Link to="/stores" className="transition hover:text-black">Store finder</Link>
            </nav>

            <div className="flex items-center gap-2.5">
              <Link
                to="/user-auth"
                className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-black/65 transition hover:bg-black/[0.04] hover:text-black sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-xl bg-[#121316] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(18,19,22,0.18)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                Enter MetaBeys <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="relative isolate border-b border-black/[0.07] bg-white">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.34] [background-image:linear-gradient(rgba(18,19,22,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(18,19,22,0.055)_1px,transparent_1px)] [background-size:44px_44px]" />
              <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#dce6ff] blur-[2px]" />
              <div className="absolute -bottom-36 left-[35%] h-72 w-72 rounded-full bg-[#fff0a8]/70 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-24 xl:gap-20">
              <div className="relative z-10 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f7f2] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-black/70"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#5b62f4]" />
                  Built for the competitive scene
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-7 text-balance text-[clamp(3.35rem,7vw,6.6rem)] font-black leading-[0.89] tracking-[-0.075em] text-[#121316]"
                >
                  Stop guessing.
                  <span className="relative mt-1 block w-fit pr-4 text-[#5a63f2]">
                    Read the meta.
                    <svg
                      aria-hidden="true"
                      className="absolute -bottom-3 left-1 h-4 w-[96%] text-[#ffcf3f]"
                      viewBox="0 0 500 22"
                      preserveAspectRatio="none"
                    >
                      <path d="M4 15C126 3 310 3 496 10" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
                    </svg>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.17, duration: 0.58 }}
                  className="mt-9 max-w-xl text-lg leading-8 text-black/58 sm:text-xl"
                >
                  MetaBeys turns real Beyblade X tournament results into clear rankings, matchup intelligence,
                  player research, and better decisions before your next launch.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.58 }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                  <Link
                    to="/home"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#121316] px-6 py-4 font-bold text-white shadow-[0_12px_35px_rgba(18,19,22,0.2)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(18,19,22,0.24)]"
                  >
                    Explore the platform
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/events/completed"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/15 bg-white px-6 py-4 font-bold text-black transition hover:-translate-y-1 hover:border-black/30 hover:bg-[#f7f7f2]"
                  >
                    View tournament results
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.38, duration: 0.7 }}
                  className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-black/50"
                >
                  <span className="inline-flex items-center gap-2"><CircleCheck className="h-4 w-4 text-[#26a875]" /> Free to explore</span>
                  <span className="inline-flex items-center gap-2"><CircleCheck className="h-4 w-4 text-[#26a875]" /> Real tournament data</span>
                  <span className="inline-flex items-center gap-2"><CircleCheck className="h-4 w-4 text-[#26a875]" /> Built by the community</span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 28, rotate: 1.2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ delay: 0.14, duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto w-full max-w-[760px] lg:mx-0"
              >
                <div aria-hidden className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-[#ffcf3f] sm:h-40 sm:w-40" />
                <div aria-hidden className="absolute -bottom-9 left-2 h-32 w-32 rounded-[38px] bg-[#ff7d73] sm:h-44 sm:w-44" />
                <div aria-hidden className="absolute right-[18%] top-[-12%] h-28 w-8 rotate-[24deg] rounded-full bg-[#6af0bf]" />

                <div className="relative rounded-[28px] border border-black/15 bg-[#111522] p-2.5 shadow-[0_34px_80px_rgba(21,28,48,0.28)] sm:rounded-[34px] sm:p-3">
                  <div className="flex h-10 items-center justify-between px-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff746c]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ffcf3f]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#6af0bf]" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Live competitive dashboard</div>
                    <div className="w-10" />
                  </div>
                  <img
                    src="/beymeta.png"
                    alt="MetaBeys competitive leaderboard showing ranked Beyblade X parts and performance data"
                    className="w-full rounded-[20px] border border-white/10 sm:rounded-[25px]"
                    draggable={false}
                  />
                </div>

                <div className="absolute -left-3 bottom-8 hidden min-w-[210px] rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgba(18,19,22,0.16)] sm:block xl:-left-12">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5a63f2]"><Trophy className="h-5 w-5" /></span>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">Top-cut signals</div>
                      <div className="mt-0.5 text-xl font-black text-black">{comboCount ? comboCount.toLocaleString() : "5,000+"}</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-2 top-16 hidden rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgba(18,19,22,0.14)] sm:block xl:-right-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">Scene status</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-black text-black">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#31c68e] shadow-[0_0_0_5px_rgba(49,198,142,0.12)]" />
                    Data live
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* PROOF BAR */}
          <section className="border-b border-black/[0.07] bg-[#f4f3ed]">
            <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-black/[0.08] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
              <ProofMetric icon={<Trophy className="h-5 w-5" />} value={comboCount} fallback="5,000+" label="Top-cut combinations indexed" />
              <ProofMetric icon={<CalendarDays className="h-5 w-5" />} value={eventCount} fallback="250+" label="Tournament records collected" />
              <ProofMetric icon={<MapPin className="h-5 w-5" />} value={storeCount} fallback="Growing" label="Community stores mapped" />
            </div>
          </section>

          {/* LIVE META */}
          <section id="live-meta" className="relative bg-[#fbfbf8] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div className="mx-auto max-w-[1320px]">
              <motion.div {...reveal} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <Eyebrow icon={<Zap className="h-3.5 w-3.5" />}>Live meta signal</Eyebrow>
                  <h2 className="mt-5 text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[#121316] sm:text-5xl lg:text-6xl">
                    See what is winning before tournament day.
                  </h2>
                </div>
                <div className="max-w-md lg:pb-1">
                  <p className="text-base leading-7 text-black/55">
                    Rankings are built from actual top-cut appearances—not theory, hype, or somebody’s tier-list thumbnail.
                  </p>
                  <Link to="/leaderboard" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#4c55e8] transition hover:gap-3">
                    Open the full meta leaderboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>

              <div className="mt-12 grid gap-5 lg:grid-cols-3">
                {(topCombos.length ? topCombos : Array.from({ length: 3 }, (_, index) => ({
                  blade: dataLoaded ? "Meta data incoming" : "Loading live signal…",
                  ratchet: "—",
                  bit: "—",
                  appearances: 0,
                  eventCount: 0,
                  _placeholder: index,
                }))).map((combo, index) => (
                  <MetaCard key={`${combo.blade}-${index}`} combo={combo} rank={index + 1} loading={!dataLoaded} />
                ))}
              </div>
            </div>
          </section>

          {/* PRODUCT STORY */}
          <section id="platform" className="border-y border-black/[0.07] bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div className="mx-auto max-w-[1320px]">
              <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
                <Eyebrow icon={<Sparkles className="h-3.5 w-3.5" />}>The competitive toolkit</Eyebrow>
                <h2 className="mt-5 text-balance text-4xl font-black leading-[1] tracking-[-0.055em] text-[#121316] sm:text-5xl lg:text-6xl">
                  Every edge. One place.
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/55">
                  From first search to final launch, MetaBeys connects the information competitive players actually need.
                </p>
              </motion.div>

              <div className="mt-14 grid gap-5 lg:grid-cols-12">
                <motion.div {...reveal} className="relative overflow-hidden rounded-[30px] border border-[#cbd5ff] bg-[#eef1ff] p-7 sm:p-9 lg:col-span-7 lg:min-h-[460px]">
                  <div className="relative z-10 max-w-lg">
                    <FeatureIcon className="bg-[#5a63f2] text-white"><BarChart3 className="h-6 w-6" /></FeatureIcon>
                    <h3 className="mt-7 text-3xl font-black tracking-[-0.04em] text-[#15172c] sm:text-4xl">The meta, made measurable.</h3>
                    <p className="mt-4 max-w-md leading-7 text-[#242949]/65">
                      Filter parts, combinations, timeframes, events, and players. Turn thousands of tournament appearances into a signal you can act on.
                    </p>
                    <Link to="/leaderboard" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#3941c6]">Explore rankings <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                  <div className="absolute bottom-0 right-0 w-[88%] translate-x-[12%] translate-y-[18%] rounded-tl-[28px] border border-[#aebdf8] bg-white p-5 shadow-[0_22px_50px_rgba(56,65,198,0.15)] sm:w-[64%]">
                    <div className="flex items-center justify-between border-b border-black/[0.07] pb-3 text-[10px] font-black uppercase tracking-[0.14em] text-black/35">
                      <span>Blade performance</span><span>Share</span>
                    </div>
                    {[82, 64, 51, 36].map((width, index) => (
                      <div key={width} className="mt-4 grid grid-cols-[24px_1fr_42px] items-center gap-3">
                        <span className="text-xs font-black text-black/35">0{index + 1}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eceef8]"><div className="h-full rounded-full bg-[#5a63f2]" style={{ width: `${width}%` }} /></div>
                        <span className="text-right text-xs font-black text-[#252a68]">{width}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div {...reveal} className="rounded-[30px] border border-[#f0d47b] bg-[#fff4bf] p-7 sm:p-9 lg:col-span-5">
                  <FeatureIcon className="bg-[#121316] text-[#ffdc54]"><CalendarDays className="h-6 w-6" /></FeatureIcon>
                  <h3 className="mt-7 text-3xl font-black tracking-[-0.04em] text-[#24200f]">Every result leaves a trail.</h3>
                  <p className="mt-4 leading-7 text-[#3d3515]/65">Move from a completed tournament to its top cut, players, combinations, and individual parts without losing the competitive thread.</p>
                  <Link to="/events/completed" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#6a5400]">Explore the archive <ArrowRight className="h-4 w-4" /></Link>
                  <div className="mt-9 space-y-3">
                    {["Completed tournaments", "Verified top cuts", "Player & combo trails"].map((label, index) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white/70 px-4 py-3 text-sm font-bold text-black/70">
                        <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#121316] text-[10px] text-white">{index + 1}</span>{label}</span>
                        <ChevronRight className="h-4 w-4 text-black/30" />
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div {...reveal} className="rounded-[30px] border border-[#addfcf] bg-[#e6f8f1] p-7 sm:p-9 lg:col-span-5">
                  <FeatureIcon className="bg-[#1d9b73] text-white"><MapPin className="h-6 w-6" /></FeatureIcon>
                  <h3 className="mt-7 text-3xl font-black tracking-[-0.04em] text-[#102b22]">Find your local scene.</h3>
                  <p className="mt-4 leading-7 text-[#173e31]/65">Discover Beyblade-friendly stores, explore where competitive history was made, and connect online research to the real scene.</p>
                  <Link to="/stores" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#137856]">Open store finder <ArrowRight className="h-4 w-4" /></Link>
                  <div className="mt-8 rounded-2xl border border-[#8fd0bb] bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 rounded-xl bg-[#f4f7f5] px-3 py-2.5 text-sm text-black/35"><Search className="h-4 w-4" /> Search by city or store…</div>
                    <div className="mt-3 flex items-center gap-3 px-1"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#daf4ea] text-[#16805d]"><StoreIcon className="h-5 w-5" /></span><div><div className="text-sm font-black">Find a community store</div><div className="text-xs text-black/40">Search the scene by location</div></div></div>
                  </div>
                </motion.div>

                <motion.div {...reveal} className="relative overflow-hidden rounded-[30px] border border-[#ffc3bd] bg-[#fff0ed] p-7 sm:p-9 lg:col-span-7">
                  <div className="relative z-10 max-w-lg">
                    <FeatureIcon className="bg-[#ff675f] text-white"><FlaskConical className="h-6 w-6" /></FeatureIcon>
                    <h3 className="mt-7 text-3xl font-black tracking-[-0.04em] text-[#361714]">Build with evidence.</h3>
                    <p className="mt-4 leading-7 text-[#53231f]/65">Test a combination against the tournament archive, compare usage, and understand whether your build has real competitive precedent.</p>
                    <Link to="/tournament-lab" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#c93e37]">Enter Tournament Lab <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                  <div aria-hidden className="absolute -bottom-14 -right-10 h-64 w-64 rounded-full border-[34px] border-[#ffb2ab]/70" />
                  <div aria-hidden className="absolute bottom-9 right-16 h-20 w-20 rounded-full bg-[#ff675f] shadow-[0_0_0_18px_rgba(255,103,95,0.15)]" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* LATEST VERIFIED RESULTS */}
          <section id="results" className="relative overflow-hidden bg-[#f4f3ed] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div aria-hidden className="absolute -right-32 top-16 h-80 w-80 rounded-full border-[48px] border-[#dfe4ff]" />
            <div className="mx-auto max-w-[1320px]">
              <motion.div {...reveal} className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                  <Eyebrow icon={<Compass className="h-3.5 w-3.5" />}>Latest verified results</Eyebrow>
                  <h2 className="mt-5 text-balance text-4xl font-black leading-none tracking-[-0.055em] text-[#121316] sm:text-5xl lg:text-6xl">The archive is the advantage.</h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-black/52">Every completed tournament adds another signal. See who won, what topped, and how the competitive field keeps moving.</p>
                </div>
                <Link to="/events/completed" className="inline-flex w-fit items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:border-black/30">
                  Open the complete archive <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <div className="relative z-10 mt-12 grid gap-5 lg:grid-cols-2">
                {recentResults.length > 0 ? (
                  recentResults.map((event, index) => <ResultCard key={event.id} event={event} index={index} />)
                ) : (
                  Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-[250px] animate-pulse rounded-[28px] border border-black/[0.07] bg-white/70" />
                  ))
                )}
              </div>
            </div>
          </section>

          {/* THREE STEPS */}
          <section className="border-y border-black/[0.07] bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-[1320px]">
              <motion.div {...reveal} className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
                <div className="lg:sticky lg:top-8">
                  <Eyebrow icon={<Zap className="h-3.5 w-3.5" />}>How the edge compounds</Eyebrow>
                  <h2 className="mt-5 text-4xl font-black leading-[1] tracking-[-0.055em] text-[#121316] sm:text-5xl">From results to better decisions.</h2>
                  <p className="mt-5 max-w-md leading-7 text-black/55">MetaBeys makes the competitive loop visible, searchable, and useful to everyone in the scene.</p>
                </div>

                <div className="divide-y divide-black/[0.09] border-y border-black/[0.09]">
                  <ProcessStep number="01" icon={<Users className="h-5 w-5" />} title="The community competes" copy="Players and organizers create the results that define the real-world Beyblade X scene." color="bg-[#eef1ff] text-[#4c55e8]" />
                  <ProcessStep number="02" icon={<BarChart3 className="h-5 w-5" />} title="MetaBeys finds the signal" copy="Parts, combinations, placements, players, and events become connected competitive intelligence." color="bg-[#fff4bf] text-[#725b00]" />
                  <ProcessStep number="03" icon={<Trophy className="h-5 w-5" />} title="You arrive better prepared" copy="Research the field, refine your deck, find the right event, and make every launch more informed." color="bg-[#e6f8f1] text-[#147755]" />
                </div>
              </motion.div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="bg-[#fbfbf8] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <motion.div
              {...reveal}
              className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[34px] bg-[#121316] px-6 py-16 text-white shadow-[0_30px_80px_rgba(18,19,22,0.2)] sm:px-12 lg:px-16 lg:py-20"
            >
              <div aria-hidden className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#5a63f2]" />
              <div aria-hidden className="absolute -bottom-28 right-[24%] h-64 w-64 rounded-full bg-[#ffcf3f]" />
              <div aria-hidden className="absolute right-[11%] top-[53%] h-28 w-28 rounded-[28px] bg-[#ff7169]" />
              <div className="relative z-10 max-w-3xl">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#91f2cc]">The next launch is yours</div>
                <h2 className="mt-5 text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Know the scene. Build smarter. Compete harder.</h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">The competitive Beyblade X scene is already producing the data. MetaBeys makes it yours.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/home" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:-translate-y-1 hover:bg-[#f2f2ed]">Enter MetaBeys <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/user-auth" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-white/15">Create a free account</Link>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        <footer className="border-t border-black/[0.08] bg-white px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-lg bg-[#121316] px-2"><img src="/logolargestsolo.png" alt="" className="w-full" /></span>
              <div><div className="font-black tracking-[-0.03em]">METABEYS</div><div className="text-xs text-black/40">Competitive Beyblade X intelligence</div></div>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-black/50" aria-label="Footer navigation">
              <Link to="/home" className="hover:text-black">Platform</Link>
              <Link to="/events/completed" className="hover:text-black">Results</Link>
              <Link to="/stores" className="hover:text-black">Stores</Link>
              <Link to="/contact" className="hover:text-black">Contact</Link>
              <Link to="/privacy" className="hover:text-black">Privacy</Link>
            </nav>
            <div className="text-sm text-black/35">© {new Date().getFullYear()} MetaBeys</div>
          </div>
        </footer>
      </div>
    </>
  )
}

function Eyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-[#4c55e8]">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e9edff]">{icon}</span>
      {children}
    </div>
  )
}

function FeatureIcon({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${className}`}>{children}</span>
}

function ProofMetric({ icon, value, fallback, label }: { icon: ReactNode; value: number; fallback: string; label: string }) {
  return (
    <div className="flex items-center gap-4 py-7 sm:justify-center sm:px-6 lg:py-8">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-[#4c55e8]">{icon}</span>
      <div>
        <div className="text-2xl font-black tracking-[-0.04em] text-[#121316] sm:text-3xl">
          {value ? <CountUp end={value} duration={1.1} separator="," /> : fallback}
        </div>
        <div className="mt-0.5 text-xs font-bold text-black/40 sm:text-sm">{label}</div>
      </div>
    </div>
  )
}

function MetaCard({ combo, rank, loading }: { combo: TopCombo & { _placeholder?: number }; rank: number; loading: boolean }) {
  const styles = [
    "border-[#bdcafb] bg-[#edf1ff]",
    "border-[#f1d574] bg-[#fff4bd]",
    "border-[#ffbcb7] bg-[#ffefec]",
  ]
  const numberStyles = ["text-[#5460e9]", "text-[#ad8500]", "text-[#e2554d]"]

  return (
    <motion.div {...reveal} transition={{ ...reveal.transition, delay: (rank - 1) * 0.08 }}>
      <Link
        to={loading ? "#live-meta" : `/leaderboard?blade=${encodeURIComponent(combo.blade)}`}
        className={`group relative block min-h-[340px] overflow-hidden rounded-[28px] border p-7 transition duration-300 hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(18,19,22,0.12)] ${styles[rank - 1]}`}
      >
        <div className={`absolute -right-1 -top-9 text-[10rem] font-black leading-none tracking-[-0.1em] opacity-[0.10] ${numberStyles[rank - 1]}`}>0{rank}</div>
        <div className="relative z-10 flex h-full min-h-[285px] flex-col">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-[0.18em] ${numberStyles[rank - 1]}`}>Meta rank {rank}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 transition group-hover:translate-x-1 group-hover:bg-white"><ArrowRight className="h-4 w-4" /></span>
          </div>
          <div className="mt-auto pt-16">
            <h3 className="text-3xl font-black leading-[1.02] tracking-[-0.045em] text-[#121316] sm:text-4xl">{combo.blade}</h3>
            <div className="mt-3 text-base font-bold text-black/48">{combo.ratchet} <span className="mx-1 text-black/20">•</span> {combo.bit}</div>
            <div className="mt-6 flex gap-6 border-t border-black/10 pt-5">
              <div><div className="text-xl font-black text-black">{combo.appearances || "—"}</div><div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/35">Appearances</div></div>
              <div><div className="text-xl font-black text-black">{combo.eventCount || "—"}</div><div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/35">Events</div></div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function ResultCard({ event, index }: { event: EventItem; index: number }) {
  const date = event.startTime || event.date || new Date()
  const accents = [
    "border-t-[#5a63f2] bg-[#edf1ff] text-[#4c55e8]",
    "border-t-[#e6ad00] bg-[#fff3b9] text-[#856600]",
    "border-t-[#1d9b73] bg-[#e1f7ef] text-[#147755]",
    "border-t-[#ff675f] bg-[#ffebe8] text-[#c84a43]",
  ]
  const accentBars = ["bg-[#5a63f2]", "bg-[#e6ad00]", "bg-[#1d9b73]", "bg-[#ff675f]"]
  const location = [event.city, event.region].filter(Boolean).join(", ") || event.store || "Competitive circuit"

  return (
    <motion.div {...reveal} transition={{ ...reveal.transition, delay: index * 0.06 }}>
      <Link
        to={`/events/${event.id}`}
        className="group relative grid min-h-[250px] overflow-hidden rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-[0_10px_28px_rgba(18,19,22,0.035)] transition hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(18,19,22,0.1)] sm:grid-cols-[88px_1fr] sm:gap-6"
      >
        <div className={`absolute inset-x-0 top-0 h-1 ${accentBars[index % accentBars.length]}`} />
        <div className="flex items-start justify-between sm:block">
          <div className={`flex h-[76px] w-[76px] flex-col items-center justify-center rounded-[22px] ${accents[index % accents.length]}`}>
            <span className="text-[10px] font-black tracking-[0.14em]">{fmtMonth(date)}</span>
            <span className="mt-0.5 text-3xl font-black leading-none">{fmtDay(date)}</span>
          </div>
          <div className="mt-4 hidden text-center text-[10px] font-black uppercase tracking-[0.13em] text-black/28 sm:block">Verified</div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/45 transition group-hover:translate-x-1 group-hover:border-black/25 group-hover:text-black sm:hidden"><ArrowRight className="h-4 w-4" /></span>
        </div>
        <div className="mt-6 flex min-w-0 flex-col sm:mt-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-black/35">Result #{String(index + 1).padStart(2, "0")}</div>
              <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-[1.08] tracking-[-0.035em] text-[#121316]">{event.title}</h3>
            </div>
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black/45 transition group-hover:translate-x-1 group-hover:border-black/25 group-hover:text-black sm:flex"><ArrowRight className="h-4 w-4" /></span>
          </div>
          <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-black/48"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{event.store ? `${event.store} · ` : ""}{location}</span></div>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <div className="rounded-2xl bg-[#f5f5f1] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/32">Winner</div>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-black text-black"><Trophy className="h-4 w-4 shrink-0 text-[#c99500]" /><span className="truncate">{event.winner || "See top cut"}</span></div>
            </div>
            <div className="rounded-2xl bg-[#f5f5f1] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/32">Field data</div>
              <div className="mt-1 text-sm font-black text-black">{event.attendeeCount ? `${event.attendeeCount} players` : `${event.topCutCount || 0} top cut`}</div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function ProcessStep({ number, icon, title, copy, color }: { number: string; icon: ReactNode; title: string; copy: string; color: string }) {
  return (
    <div className="grid gap-4 py-8 sm:grid-cols-[72px_56px_1fr] sm:items-start sm:gap-5 sm:py-10">
      <div className="text-sm font-black tracking-[0.12em] text-black/25">{number}</div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>{icon}</span>
      <div><h3 className="text-2xl font-black tracking-[-0.035em] text-[#121316]">{title}</h3><p className="mt-2 max-w-xl leading-7 text-black/50">{copy}</p></div>
    </div>
  )
}
