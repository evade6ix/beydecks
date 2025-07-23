import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Trophy, Award, Medal } from "lucide-react"

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

const ITEMS_PER_PAGE = 10

export default function Leaderboard() {
  const [parts, setParts] = useState<PartStats[]>([])
  const [timeframe, setTimeframe] = useState("All")
  const [partType, setPartType] = useState<"blade" | "ratchet" | "bit">("blade")
  const [currentPage, setCurrentPage] = useState(1)

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
        setCurrentPage(1) // Reset page on filter change
      })
  }, [timeframe, partType])

  const getTrophy = (rank: number) => {
    if (rank === 0) return <Trophy className="text-yellow-400 w-6 h-6" />
    if (rank === 1) return <Award className="text-gray-400 w-5 h-5" />
    if (rank === 2) return <Medal className="text-amber-700 w-5 h-5" />
    return null
  }

  const totalPages = Math.ceil(parts.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const currentParts = parts.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const renderPageNumbers = () => {
    const pages = []
    const maxButtons = 5 // Show 5 page buttons at a time
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    let endPage = Math.min(totalPages, startPage + maxButtons - 1)

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1)
    }

    if (startPage > 1) {
      pages.push(
        <button key="first" onClick={() => changePage(1)} className="btn btn-sm">
          1
        </button>
      )
      if (startPage > 2) {
        pages.push(<span key="ellipsis-start" className="mx-1">...</span>)
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => changePage(i)}
          className={`btn btn-sm ${i === currentPage ? "btn-primary" : ""}`}
        >
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis-end" className="mx-1">...</span>)
      }
      pages.push(
        <button key="last" onClick={() => changePage(totalPages)} className="btn btn-sm">
          {totalPages}
        </button>
      )
    }

    return pages
  }

  return (
    <motion.div
      className="p-6 max-w-3xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
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

        <label className="font-semibold ml-4">Part Type:</label>
        <select
          className="select select-bordered"
          value={partType}
          onChange={e =>
            setPartType(e.target.value as "blade" | "ratchet" | "bit")
          }
        >
          <option value="blade">Blade</option>
          <option value="ratchet">Ratchet</option>
          <option value="bit">Bit</option>
        </select>
      </div>

      <div className="space-y-2">
        {currentParts.map((p, idx) => (
          <Link
            key={startIdx + idx}
            to={`/${partType}s/${encodeURIComponent(p.name)}`}
            className="card bg-base-200 p-4 flex justify-between items-center hover:shadow-lg transition"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{startIdx + idx + 1}.</span>
              {getTrophy(startIdx + idx)}
              <span className="text-lg font-semibold">{p.name}</span>
            </div>
            <p className="text-sm text-neutral-content">{p.count} appearances</p>
          </Link>
        ))}
      </div>

      {/* Full Pagination Bar */}
      <div className="mt-6 flex justify-center items-center gap-2 flex-wrap">
        <button
          className="btn btn-sm"
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lt; Prev
        </button>

        {renderPageNumbers()}

        <button
          className="btn btn-sm"
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next &gt;
        </button>
      </div>
    </motion.div>
  )
}

