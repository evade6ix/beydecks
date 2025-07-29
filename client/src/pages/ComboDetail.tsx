import { useParams, Link } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Combo {
  blade: string
  ratchet: string
  bit: string
  assistBlade?: string
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

  if (!slug) return <div>No combo found</div>

 const parts = decodeURIComponent(slug).toLowerCase().split("-")

let blade = ""
let assistBlade: string | undefined = undefined
let ratchet = ""
let bit = ""

// 4-part combo (blade + assistBlade + ratchet + bit)
if (parts.length >= 5) {
  bit = normalize(parts[parts.length - 1])
  ratchet = normalize(parts.slice(parts.length - 3, parts.length - 1).join("-"))
  assistBlade = normalize(parts[parts.length - 4])
  blade = normalize(parts.slice(0, parts.length - 4).join("-"))
} else {
  // 3-part combo
  bit = normalize(parts[parts.length - 1])
  ratchet = normalize(parts.slice(parts.length - 3, parts.length - 1).join("-"))
  blade = normalize(parts.slice(0, parts.length - 3).join("-"))
}


  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then(setEvents)
      .catch(err => console.error("❌ Failed to fetch events:", err))
      .finally(() => setLoading(false))
  }, [])

  const matchesCombo = (combo: Combo) =>
    normalize(combo.blade) === blade &&
    normalize(combo.ratchet) === ratchet &&
    normalize(combo.bit) === bit &&
    (assistBlade ? normalize(combo.assistBlade || "") === assistBlade : !combo.assistBlade)


  const groupedResults = useMemo(() => {
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
          if (matchesCombo(combo)) {
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
          count
        })
      }
    }

    return grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [events, blade, ratchet, bit, timeframe])

  const totalPages = Math.ceil(groupedResults.length / perPage)
  const paginated = groupedResults.slice((page - 1) * perPage, page * perPage)

  const readable = {
    blade: blade.replace(/-/g, " "),
    assistBlade: assistBlade?.replace(/-/g, " "),
    ratchet: ratchet.replace(/-/g, " "),
    bit: bit.replace(/-/g, " ")
}

  return (
    <>
      <Helmet>
  <title>
    {assistBlade
      ? `${readable.blade} + ${readable.assistBlade} / ${readable.ratchet} / ${readable.bit} — Combo Stats | Meta Beys`
      : `${readable.blade} / ${readable.ratchet} / ${readable.bit} — Combo Stats | Meta Beys`}
  </title>
  <meta
    name="description"
    content={
      assistBlade
        ? `Explore tournament appearances and event data for the ${readable.blade} + ${readable.assistBlade} / ${readable.ratchet} / ${readable.bit} Beyblade X combo.`
        : `Explore tournament appearances and event data for the ${readable.blade} / ${readable.ratchet} / ${readable.bit} Beyblade X combo.`
    }
  />
  <meta
    property="og:title"
    content={
      assistBlade
        ? `${readable.blade} + ${readable.assistBlade} / ${readable.ratchet} / ${readable.bit} — Meta Beys`
        : `${readable.blade} / ${readable.ratchet} / ${readable.bit} — Meta Beys`
    }
  />
  <meta
    property="og:description"
    content={
      assistBlade
        ? `View how the ${readable.blade}, ${readable.assistBlade}, ${readable.ratchet}, and ${readable.bit} combo performs in competitive Beyblade X tournaments.`
        : `View how the ${readable.blade}, ${readable.ratchet}, and ${readable.bit} combo performs in competitive Beyblade X tournaments.`
    }
  />
  <meta property="og:url" content={`https://www.metabeys.com/combo/${slug}`} />
  <meta name="robots" content="index, follow" />
</Helmet>


      <div className="p-6 max-w-4xl mx-auto space-y-6">
  <div>
    <h1 className="text-3xl font-bold mb-2">Combo Details</h1>
    <p><strong>Blade:</strong> {readable.blade}</p>
    {readable.assistBlade && (
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
