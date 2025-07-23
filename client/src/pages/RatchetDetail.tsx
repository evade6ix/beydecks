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
  blade: string
  bit: string
  count: number
}

export default function RatchetDetail() {
  const { name } = useParams()
  const [combos, setCombos] = useState<ComboStats[]>([])
  const [timeframe, setTimeframe] = useState("All")
  const [page, setPage] = useState(1)
  const perPage = 7

  useEffect(() => {
    setPage(1)
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
                if (ratchet.trim().toLowerCase() === name?.trim().toLowerCase()) {
                  const key = `${blade.trim()}::${bit.trim()}`
                  if (countMap.has(key)) {
                    countMap.get(key)!.count++
                  } else {
                    countMap.set(key, {
                      blade: blade.trim(),
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

  const readable = name?.replace(/-/g, " ") ?? "Ratchet"
  const totalPages = Math.ceil(combos.length / perPage)

  const paginatedCombos = useMemo(() => {
    return combos.slice((page - 1) * perPage, page * perPage)
  }, [combos, page])

  return (
    <>
      <Helmet>
        <title>{readable} — Top Combos & Usage Stats | Meta Beys</title>
        <meta name="description" content={`View the top Beyblade X combos using ${readable}.`} />
        <meta property="og:title" content={`${readable} — Meta Beys`} />
        <meta property="og:description" content={`Explore combo stats for ${readable}.`} />
        <meta property="og:url" content={`https://www.metabeys.com/ratchet/${name}`} />
      </Helmet>

      <motion.div className="p-6 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-4 capitalize">{readable}</h1>
        <p className="text-neutral-content mb-6">Top Combos for this ratchet:</p>

        <div className="mb-4 w-64">
          <label className="font-semibold mb-1 block">Filter by Timeframe:</label>
          <select className="select select-bordered w-full" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option>All</option>
            <option>Past Week</option>
            <option>Past Month</option>
            <option>This Year</option>
          </select>
        </div>

        <div className="grid gap-4">
          {paginatedCombos.map((combo, i) => {
            const slug = encodeURIComponent(
              `${combo.blade.toLowerCase()}-${name?.toLowerCase().trim()}-${combo.bit.toLowerCase()}`
            )

            return (
              <Link to={`/combo/${slug}`} key={i} className="block">
                <div className="card bg-base-200 p-4 hover:shadow-md transition cursor-pointer">
                  <p className="font-medium">{combo.blade} / {combo.bit}</p>
                  <p className="text-sm text-neutral-content">{combo.count} use{combo.count > 1 ? "s" : ""}</p>
                </div>
              </Link>
            )
          })}
          {!combos.length && <p className="text-error text-sm">No combos found for this ratchet.</p>}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-3">
            <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
