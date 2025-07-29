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

export default function ComboDetail() {
  const { slug } = useParams()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [timeframe, setTimeframe] = useState("All")
  const perPage = 5

  const [matchedCombo, setMatchedCombo] = useState<Combo | null>(null)

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(data)

        for (const event of data) {
          for (const player of event.topCut || []) {
            for (const combo of player.combos) {
              const generatedSlug = [
                normalize(combo.blade),
                combo.assistBlade ? normalize(combo.assistBlade) : null,
                normalize(combo.ratchet),
                normalize(combo.bit),
              ]
                .filter(Boolean)
                .join("-")

              if (generatedSlug === slug) {
                setMatchedCombo(combo)
                return
              }
            }
          }
        }
      })
      .catch(err => console.error("❌ Failed to fetch events:", err))
      .finally(() => setLoading(false))
  }, [slug])

  const groupedResults = useMemo(() => {
    if (!matchedCombo) return []

    const now = new Date()
    let filteredEvents = [...events]

    if (timeframe === "This Week") {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      filteredEvents = filteredEvents.filter(e => new Date(e.startTime) >= startOfWeek)
    }

    if (timeframe === "This Month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filteredEvents = filteredEvents.filter(e => new Date(e.startTime) >= startOfMonth)
    }

    if (timeframe === "This Year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      filteredEvents = filteredEvents.filter(e => new Date(e.startTime) >= startOfYear)
    }

    const grouped: {
      eventId: string
      eventTitle: string
      date: string
      store: string
      count: number
    }[] = []

    for (const event of filteredEvents) {
      if (!event.topCut) continue

      let count = 0
      for (const player of event.topCut) {
        for (const combo of player.combos) {
          const comboSlug = [
            normalize(combo.blade),
            combo.assistBlade ? normalize(combo.assistBlade) : null,
            normalize(combo.ratchet),
            normalize(combo.bit),
          ]
            .filter(Boolean)
            .join("-")

          if (comboSlug === slug) {
            count++
          }
        }
      }

      if (count > 0) {
        grouped.push({
          eventId: String(event.id),
          eventTitle: event.title,
          date: event.startTime,
          store: event.store,
          count,
        })
      }
    }

    return grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [events, slug, timeframe, matchedCombo])

  const totalPages = Math.ceil(groupedResults.length / perPage)
  const paginated = groupedResults.slice((page - 1) * perPage, page * perPage)

  const readable = {
    blade: matchedCombo?.blade || "",
    assistBlade: matchedCombo?.assistBlade || "",
    ratchet: matchedCombo?.ratchet || "",
    bit: matchedCombo?.bit || "",
  }

  return (
    <>
      <Helmet>
        <title>{`${readable.blade} / ${readable.ratchet} / ${readable.bit} — Combo Stats | Meta Beys`}</title>
        <meta
          name="description"
          content={`Explore tournament appearances and event data for the ${readable.blade} / ${readable.ratchet} / ${readable.bit} Beyblade X combo.`}
        />
      </Helmet>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <p><strong>Blade:</strong> {readable.blade}</p>
          {matchedCombo?.assistBlade && (
            <p><strong>Assist Blade:</strong> {readable.assistBlade}</p>
          )}
          <p><strong>Ratchet:</strong> {readable.ratchet}</p>
          <p><strong>Bit:</strong> {readable.bit}</p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mt-6 mb-2">Used In Events</h2>

          <div className="mb-4">
            <label className="mr-2 font-semibold">Timeframe:</label>
            <select
              className="select select-bordered"
              value={timeframe}
              onChange={(e) => {
                setPage(1)
                setTimeframe(e.target.value)
              }}
            >
              <option>All</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>

          {loading ? (
            <p>Loading events...</p>
          ) : groupedResults.length === 0 ? (
            <p className="text-error">No events found with this combo.</p>
          ) : (
            <>
              <table className="table w-full text-sm">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Store</th>
                    <th>Total Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry, i) => (
                    <tr key={i}>
                      <td>
                        <Link to={`/events/${entry.eventId}`} className="link link-hover">
                          {entry.eventTitle}
                        </Link>
                      </td>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td>{entry.store}</td>
                      <td>{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-center items-center gap-3">
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
