import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Event {
  id: number
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  capacity?: number
  country?: string
  region?: string
  city?: string
}

export default function StoreUpcomingEvents() {
  const { id } = useParams()
  const [events, setEvents] = useState<Event[]>([])
  const [storeName, setStoreName] = useState("")
  const [timeframe, setTimeframe] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const eventsPerPage = 10

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: Event[]) => {
        const now = new Date()
        const upcoming = data.filter(e => new Date(e.startTime) > now)
        setEvents(upcoming)
      })

    fetch(`${API}/stores/${id}`)
      .then(res => res.json())
      .then(data => setStoreName(data.name))
  }, [id])

  const now = new Date()
  const filteredEvents = events
    .filter(e => e.store?.trim().toLowerCase() === storeName.trim().toLowerCase())
    .filter(e => {
      const start = new Date(e.startTime)
      if (timeframe === "This Week") {
        const weekFromNow = new Date()
        weekFromNow.setDate(now.getDate() + 7)
        return start <= weekFromNow
      }
      if (timeframe === "This Month") {
        return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
      }
      if (timeframe === "This Year") {
        return start.getFullYear() === now.getFullYear()
      }
      return true
    })

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage)
  const indexOfLast = currentPage * eventsPerPage
  const indexOfFirst = indexOfLast - eventsPerPage
  const currentEvents = filteredEvents.slice(indexOfFirst, indexOfLast)

  return (
    <motion.div className="p-6 max-w-7xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold mb-4">
        Upcoming Events for {storeName}
      </h1>

      <div className="mb-4">
        <label className="font-semibold mr-2">Timeframe:</label>
        <select
          value={timeframe}
          onChange={e => {
            setTimeframe(e.target.value)
            setCurrentPage(1)
          }}
          className="select select-sm select-bordered"
        >
          <option>All</option>
          <option>This Week</option>
          <option>This Month</option>
          <option>This Year</option>
        </select>
      </div>

      {currentEvents.length === 0 ? (
        <p className="text-neutral-content">No upcoming events found for this store.</p>
      ) : (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentEvents.map(event => (
            <div key={event.id} className="card bg-base-200 shadow-md">
              <div className="card-body">
                <h2 className="card-title">{event.title}</h2>
                <p className="text-sm text-neutral-content font-medium">
                  <span className="font-bold">Store:</span> {storeName}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Date:</span> {new Date(event.startTime).toLocaleString()}
                </p>
                {(event.city || event.region || event.country) && (
                  <p className="text-sm text-neutral-content">
                    📍 {[event.city, event.region, event.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {event.capacity !== undefined && (
                  <p className="text-sm text-neutral-content">Capacity: {event.capacity}</p>
                )}
                <div className="card-actions justify-end gap-2">
                  {event.buyLink && (
                    <a
                      href={event.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      Buy Ticket 🎟️
                    </a>
                  )}
                  <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">View</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            className="btn btn-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            ◀ Prev
          </button>
          <span className="btn btn-sm btn-disabled">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </motion.div>
  )
}