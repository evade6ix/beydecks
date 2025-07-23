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

interface PartStats {
  name: string
  count: number
}

export default function Leaderboard() {
  const [parts, setParts] = useState<PartStats[]>([])
  const [timeframe, setTimeframe] = useState("All")
  const [partType, setPartType] = useState<"blade" | "ratchet" | "bit">("blade")

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

        const partMap: Record<string, number> = {}

        filtered.forEach(event =>
          event.topCut?.forEach(player =>
            player.combos?.forEach(combo => {
              const part = combo[partType]?.trim()
              if (part) {
                partMap[part] = (partMap[part] || 0) + 1
              }
            })
          )
        )

        const sorted = Object.entries(partMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        setParts(sorted)
      })
  }, [timeframe, partType])

  const title = {
    blade: "Top 10 Blades",
    ratchet: "Top 10 Ratchets",
    bit: "Top 10 Bits"
  }[partType]

  const detailPath = {
    blade: "blades",
    ratchet: "ratchets",
    bit: "bits"
  }[partType]

  return (
    <motion.div className="p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold mb-6">{title}</h1>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="font-semibold">Part:</label>
          <select
            className="select select-bordered"
            value={partType}
            onChange={e => setPartType(e.target.value as "blade" | "ratchet" | "bit")}
          >
            <option value="blade">Blade</option>
            <option value="ratchet">Ratchet</option>
            <option value="bit">Bit</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold">Timeframe:</label>
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
      </div>

      <div className="space-y-4">
        {parts.map((p, idx) => (
          <Link
            key={idx}
            to={`/${detailPath}/${encodeURIComponent(p.name)}`}
            className="card bg-base-200 p-4 hover:shadow-lg transition"
          >
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="text-sm text-neutral-content">{p.count} appearances</p>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
