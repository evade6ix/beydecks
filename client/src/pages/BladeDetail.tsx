import { useParams, Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"

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

interface ComboStats {
  ratchet: string
  bit: string
  count: number
}

export default function BladeDetail() {
  const { name } = useParams()
  const [combos, setCombos] = useState<ComboStats[]>([])
  const [timeframe, setTimeframe] = useState("All")
  const [page, setPage] = useState(1)
  const perPage = 7

  useEffect(() => {
    setPage(1) // reset page when blade or filter changes
  }, [timeframe, name])

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: Event[]) => {
        const countMap = new Map<string, ComboStats>()
        const now = new Date()
        let cutoff: Date | null = null

        if (timeframe === "Past Week") {
          cutoff = new Date(now)
          cutoff.setDate(now.getDate() - 7)
        } else if (timeframe === "Past Month") {
          cutoff = new Date(now)
          cutoff.setMonth(now.getMonth() - 1)
        } else if (timeframe === "This Year") {
          cutoff = new Date(now.getFullYear(), 0, 1)
        }

        data
          .filter(e => new Date(e.endTime) < now)
          .filter(e => !cutoff || new Date(e.startTime) >= cutoff)
          .forEach(event =>
            event.topCut?.forEach(player =>
              player.combos?.forEach(({ blade, ratchet, bit }) => {
                if (blade.trim().toLowerCase() === name?.trim().toLowerCase()) {
                  const key = `${ratchet.trim()}::${bit.trim()}`
                  if (countMap.has(key)) {
                    countMap.get(key)!.count++
                  } else {
                    countMap.set(key, {
                      ratchet: ratchet.trim(),
                      bit: bit.trim(),
                      count: 1,
                    })
                  }
                }
              })
            )
          )

        const sorted = Array.from(countMap.values()).sort((a, b) => b.count - a.count)
        setCombos(sorted)
      })
  }, [name, timeframe])

  const readableBlade = name?.replace(/-/g, " ") ?? "Blade"
  const totalPages = Math.ceil(combos.length / perPage)

  const paginatedCombos = useMemo(() => {
    return combos.slice((page - 1) * perPage, page * perPage)
  }, [combos, page])

  return (
    <>
      <Helmet>
        <title>{readableBlade} — Top Combos & Usage Stats | Meta Beys</title>
        <meta
          name="description"
          content={`View the top competitive Beyblade X combos using ${readableBlade}. See usage stats and explore optimal pairings.`}
        />
        <meta property="og:title" content={`${readableBlade} — Meta Beys`} />
        <meta
          property="og:description"
          content={`Explore combo data and usage statistics for ${readableBlade} in real tournaments.`}
        />
        <meta property="og:url" content={`https://www.metabeys.com/blade/${name}`} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div className="p-6 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-4 capitalize">{readableBlade}</h1>
        <p className="text-neutral-content mb-6">Top Combos for this blade (by usage count):</p>

        {/* Timeframe Filter */}
        <div className="mb-4 w-64">
          <label className="font-semibold mb-1 block">Filter by Timeframe:</label>
          <select
            className="select select-bordered w-full"
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
          >
            <option>All</option>
            <option>Past Week</option>
            <option>Past Month</option>
            <option>This Year</option>
          </select>
        </div>

        <div className="grid gap-4">
          {paginatedCombos.map((combo, i) => {
            const slug = encodeURIComponent(
              `${name?.toLowerCase().trim().replace(/\s+/g, "-")}-${combo.ratchet.toLowerCase()}-${combo.bit.toLowerCase()}`
            )

            return (
              <Link to={`/combo/${slug}`} key={i} className="block">
                <div className="card bg-base-200 p-4 hover:shadow-md transition cursor-pointer">
                  <p className="font-medium">{combo.ratchet} / {combo.bit}</p>
                  <p className="text-sm text-neutral-content">
                    {combo.count} use{combo.count > 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            )
          })}

          {!combos.length && (
            <p className="text-error text-sm">No combos found for this blade.</p>
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
    </>
  )
}
