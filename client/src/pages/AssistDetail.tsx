import { useParams, Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet-async"

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
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  topCut?: Player[]
}

const normalize = (str: string) =>
  str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "")

export default function AssistDetail() {
  const { name } = useParams()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
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

        const matched = filtered.filter(event =>
          event.topCut?.some(player =>
            player.combos?.some(combo => normalize(combo.assistBlade || "") === name)
          )
        )

        setEvents(matched)
        setLoading(false)
      })
  }, [name, timeframe])

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * 10
    return events.slice(start, start + 10)
  }, [events, page])

  const totalPages = Math.ceil(events.length / 10)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Helmet>
        <title>{name?.replace(/-/g, " ")} - Assist Blade Usage</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-6 capitalize">
        Assist Blade: {name?.replace(/-/g, " ")}
      </h1>

      <div className="mb-4 flex gap-2">
        <label className="font-semibold">Timeframe:</label>
        <select
          className="select select-bordered"
          value={timeframe}
          onChange={e => {
            setPage(1)
            setTimeframe(e.target.value)
          }}
        >
          <option>All</option>
          <option>Past Week</option>
          <option>Past Month</option>
          <option>Past Year</option>
        </select>
      </div>

      {loading ? (
        <p>Loading events...</p>
      ) : paginatedEvents.length === 0 ? (
        <p className="text-error">No events found using this assist blade.</p>
      ) : (
        <div className="space-y-4">
          {paginatedEvents.map(event => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="card bg-base-200 p-4 hover:shadow transition block"
            >
              <h2 className="text-xl font-semibold mb-1">{event.title}</h2>
              <p className="text-sm text-neutral-content">{new Date(event.endTime).toLocaleDateString()} @ {event.store}</p>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-3 items-center">
          <button
            className="btn btn-sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
