import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Combo {
  blade: string
  ratchet: string
  bit: string
}

interface Player {
  name: string
  combos: Combo[]
}

interface Event {
  id: number
  title: string
  startTime: string
  endTime: string
  store: string
  topCut?: Player[]
}

interface BladeStats {
  name: string
  count: number
}

export default function Leaderboard() {
  const [blades, setBlades] = useState<BladeStats[]>([])
  const [timeframe, setTimeframe] = useState("All")

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: Event[]) => {
        const now = new Date()

        let filtered = data.filter(e => new Date(e.endTime) < now)

        if (timeframe === "Past Week") {
          const cutoff = new Date()
          cutoff.setDate(now.getDate() - 7)
          filtered = filtered.filter(e => new Date(e.endTime) >= cutoff)
        }

        if (timeframe === "Past Month") {
          const cutoff = new Date()
          cutoff.setMonth(now.getMonth() - 1)
          filtered = filtered.filter(e => new Date(e.endTime) >= cutoff)
        }

        if (timeframe === "Past Year") {
          const cutoff = new Date()
          cutoff.setFullYear(now.getFullYear() - 1)
          filtered = filtered.filter(e => new Date(e.endTime) >= cutoff)
        }

        const bladeMap: Record<string, number> = {}

        filtered.forEach(event =>
          event.topCut?.forEach(player =>
            player.combos?.forEach(combo => {
              const blade = combo.blade?.trim()
              if (blade) {
                bladeMap[blade] = (bladeMap[blade] || 0) + 1
              }
            })
          )
        )

        const sorted = Object.entries(bladeMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        setBlades(sorted)
      })
  }, [timeframe])

  return (
    <motion.div className="p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold mb-6">Top 10 Blades</h1>

      <div className="mb-4 flex gap-4 items-center">
        <label className="font-semibold mr-2">Timeframe:</label>
        <select
          className="select select-bordered"
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
        >
          <option>All</option>
          <option>Past Week</option>
          <option>Past Month</option>
          <option>Past Year</option>
        </select>
      </div>

      <div className="space-y-4">
        {blades.map((b, idx) => (
          <Link
            key={idx}
            to={`/blades/${encodeURIComponent(b.name)}`}
            className="card bg-base-200 p-4 hover:shadow-lg transition"
          >
            <p className="text-lg font-semibold">{b.name}</p>
            <p className="text-sm text-neutral-content">{b.count} appearances</p>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}