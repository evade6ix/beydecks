import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Trophy, CalendarCheck, PieChart, ShoppingCart, MapPin } from "lucide-react"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function Landing() {
  const [comboCount, setComboCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [storeCount, setStoreCount] = useState(0)
  const [topCombos, setTopCombos] = useState<{ blade: string; ratchet: string; bit: string; count: number }[]>([])
  const [timeframe, setTimeframe] = useState<"all" | "year" | "month" | "week">("all")

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: { topCut?: { combos?: { blade: string; ratchet: string; bit: string }[] }[], startTime?: string, date?: string }[]) => {
        const now = new Date()
        const filteredEvents = data.filter(event => {
          const eventDate = new Date(event.startTime || event.date || 0)
          if (timeframe === "year") return eventDate >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          if (timeframe === "month") return eventDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          if (timeframe === "week") return eventDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          return true
        })

        setEventCount(filteredEvents.length)

        const comboMap = new Map<string, { blade: string; ratchet: string; bit: string; count: number }>()
        let totalCombos = 0

        filteredEvents.forEach(event => {
          event.topCut?.forEach(player => {
            player.combos?.forEach(combo => {
              const key = `${combo.blade}|||${combo.ratchet}|||${combo.bit}`
              if (comboMap.has(key)) {
                comboMap.get(key)!.count++
              } else {
                comboMap.set(key, { ...combo, count: 1 })
              }
              totalCombos++
            })
          })
        })

        const sortedCombos = [...comboMap.values()].sort((a, b) => b.count - a.count)
        const uniqueCombos: typeof sortedCombos = []
        const usedParts = new Set<string>()

        for (const combo of sortedCombos) {
          const parts = [combo.blade, combo.ratchet, combo.bit]
          if (parts.every(part => !usedParts.has(part))) {
            uniqueCombos.push(combo)
            parts.forEach(p => usedParts.add(p))
          }
          if (uniqueCombos.length === 3) break
        }

        setTopCombos(uniqueCombos)
        setComboCount(totalCombos)
      })

    fetch(`${API}/stores`)
      .then(res => res.json())
      .then((data: any[]) => setStoreCount(data.length))
  }, [timeframe])

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

      <motion.div
        className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* HERO */}
        <section className="px-6 py-20 max-w-6xl mx-auto text-center space-y-6">
          <motion.h1
            className="text-5xl sm:text-6xl font-extrabold tracking-tight"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Track the <span className="text-accent">Meta</span> of Beyblade X
          </motion.h1>
          <motion.p
            className="text-lg text-neutral-300 max-w-2xl mx-auto"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Discover top-performing combos, upcoming tournaments, and buy from verified vendors — all in one platform.
          </motion.p>
          <motion.div
            className="flex justify-center gap-4 mt-6"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Link to="/home" className="btn btn-primary btn-lg">Enter MetaBeys</Link>
            <Link to="/user-auth" className="btn btn-outline btn-lg">Join Today</Link>
          </motion.div>
        </section>

        {/* FEATURES */}
        <section className="bg-base-100 text-base-content py-20 px-6">
          <div className="max-w-6xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold">What You Can Do</h2>
            <p className="text-neutral-600 mt-2">Competitive features built for serious bladers</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Feature icon={<Trophy className="w-8 h-8" />} title="Meta Leaderboard" desc="Live rankings of the top Blades, Ratchets, and Bits based on real tournament results." />
            <Feature icon={<CalendarCheck className="w-8 h-8" />} title="Tournaments" desc="Find upcoming events across North America. Filter by city, store, or date." />
            <Feature icon={<PieChart className="w-8 h-8" />} title="Combo Analytics" desc="Analyze top cut trends, matchup patterns, and combo effectiveness." />
            <Feature icon={<ShoppingCart className="w-8 h-8" />} title="Shop Integration" desc="See verified stores with links to buy the exact parts used in top combos." />
            <Feature icon={<MapPin className="w-8 h-8" />} title="Store Finder" desc="Browse a curated list of stores hosting Beyblade events in your region." />
            <Feature icon={<Trophy className="w-8 h-8" />} title="Tournament Lab" desc="Simulate how your combo would rank based on real meta history." />
          </div>
        </section>

        {/* MOST OPTIMAL COMBOS */}
        <section className="bg-base-100 text-base-content py-20 px-6">
          <div className="max-w-6xl mx-auto text-center mb-10">
            <h2 className="text-4xl font-bold">Top Performing Meta Combos</h2>
            <p className="text-neutral-600 mt-2">Top team to run right now — proven by real tournament data. You're welcome</p>
            <div className="text-sm text-neutral-600 mt-4">
              <label htmlFor="timeframe" className="mr-2 font-medium">View:</label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 bg-white text-black"
              >
                <option value="all">All Time</option>
                <option value="year">Past Year</option>
                <option value="month">Past Month</option>
                <option value="week">Past Week</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {topCombos.map((combo, index) => (
              <div key={index} className="p-6 rounded-xl bg-white shadow text-center hover:shadow-lg transition">
                <p className="text-xl font-bold text-accent">{combo.blade}</p>
                <p className="text-sm text-black">{combo.ratchet} • {combo.bit}</p>
                <p className="mt-2 text-sm text-black">Used in {combo.count} events</p>
              </div>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="py-20 bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white px-6">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <h2 className="text-3xl font-bold">MetaBeys in Numbers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8 text-3xl font-semibold">
              <div>
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>{comboCount}+</motion.span><br />
                <span className="text-base text-neutral-300 text-sm font-medium">Combos Tracked</span>
              </div>
              <div>
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>{eventCount}+</motion.span><br />
                <span className="text-base text-neutral-300 text-sm font-medium">Events Logged</span>
              </div>
              <div>
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>{storeCount}+</motion.span><br />
                <span className="text-base text-neutral-300 text-sm font-medium">Stores Listed</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center py-10 text-neutral-400 text-sm">
          © {new Date().getFullYear()} MetaBeys. Built by @Aysus & @Karl6ix.
        </footer>
      </motion.div>
    </>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl bg-white shadow text-center hover:shadow-lg transition">
      <div className="flex justify-center text-accent mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-black mb-1">{title}</h3>
      <p className="text-sm text-gray-700">{desc}</p>
    </div>
  )
}
