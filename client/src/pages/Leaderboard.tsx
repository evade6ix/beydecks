import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

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
  const [partType, setPartType] = useState<"blade" | "assistBlade" | "ratchet" | "bit">("blade")
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    setPage(1) // Reset pagination on filter change
  }, [timeframe, partType])

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

        setParts(sorted)
      })
  }, [timeframe, partType])

  const title = {
    blade: "Blade Usage Leaderboard",
    assistBlade: "Assist Blade Usage Leaderboard",
    ratchet: "Ratchet Usage Leaderboard",
    bit: "Bit Usage Leaderboard"
  }[partType]

  const detailPath = {
    blade: "blades",
    assistBlade: "assist-blades",
    ratchet: "ratchets",
    bit: "bits"
  }[partType]

  const totalPages = Math.ceil(parts.length / perPage)
  const paginatedParts = useMemo(() => parts.slice((page - 1) * perPage, page * perPage), [parts, page])

  return (
    <motion.div className="p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold mb-6">{title}</h1>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="font-semibold">Part:</label>
          <select
            className="select select-bordered"
            value={partType}
            onChange={e => setPartType(e.target.value as "blade" | "assistBlade" | "ratchet" | "bit")}
          >
            <option value="blade">Blade</option>
            <option value="assistBlade">Assist Blade</option>
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
        {paginatedParts.map((p, idx) => (
          <Link
            key={idx}
            to={`/${detailPath}/${encodeURIComponent(p.name)}`}
            className="card bg-base-200 p-4 hover:shadow-lg transition"
          >
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="text-sm text-neutral-content">{p.count} appearances</p>
          </Link>
        ))}

        {!paginatedParts.length && (
          <p className="text-error text-sm">No data found for this selection.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-3">
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  )
}
