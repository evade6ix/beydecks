// File: src/pages/AssistDetail.tsx
import { useParams, Link } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
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
  id: number
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

  const normName = normalize(name || "")

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

        const matching = filtered.filter(event =>
          event.topCut?.some(player =>
            player.combos?.some(combo =>
              normalize(combo.assistBlade || "") === normName
            )
          )
        )

        setEvents(matching)
        setLoading(false)
      })
  }, [name, timeframe])

  const paginatedEvents = useMemo(() => {
    const perPage = 10
    return events.slice((page - 1) * perPage, page * perPage)
  }, [events, page])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Helmet>
        <title>{name} Assist Blade - Usage</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-4">Assist Blade: {name}</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Timeframe:</label>
        <select
          className="select select-bordered"
          value={timeframe}
          onChange={e => {
            setTimeframe(e.target.value)
            setPage(1)
          }}
        >
          <option>All</option>
          <option>Past Week</option>
          <option>Past Month</option>
          <option>Past Year</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : !paginatedEvents.length ? (
        <p className="text-error">No events found using this assist blade.</p>
      ) : (
        <div className="space-y-4">
          {paginatedEvents.map((event, idx) => (
            <Link
              to={`/events/${event.id}`}
              key={idx}
              className="block p-4 border border-base-300 rounded-lg hover:shadow-md transition"
            >
              <p className="text-lg font-bold">{event.title}</p>
              <p className="text-sm text-neutral-content">
                {new Date(event.endTime).toLocaleDateString()} — {event.store}
              </p>
            </Link>
          ))}
        </div>
      )}

      {events.length > 10 && (
        <div className="mt-6 flex justify-center items-center gap-3">
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>Page {page}</span>
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page * 10 >= events.length}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
