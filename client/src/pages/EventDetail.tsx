import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { CalendarPlus } from "lucide-react"
import { toast } from "react-hot-toast"
import { Helmet } from "react-helmet-async"
import BladeUsagePie from "../components/BladeUsagePie"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Event {
  id: number
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  topCut?: Player[]
  capacity?: number
  country?: string
  region?: string
  city?: string
  attendeeCount?: number
}

interface Player {
  name: string
  combos: { blade: string; ratchet: string; bit: string; notes?: string }[]
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetch(`${API}/events/${id}`)
      .then(async res => {
        if (!res.ok) throw new Error("Event not found")
        const data = await res.json()
        setEvent(data)
      })
      .catch(err => {
        console.error("Failed to load event:", err)
        toast.error("Event not found or data is invalid.")
      })
  }, [id])

  const isUpcoming = event ? new Date(event.endTime) > new Date() : false

  const handleCalendar = () => {
    if (!event) return

    const start = new Date(event.startTime).toISOString().replace(/-|:|\.\d+/g, "")
    const end = new Date(event.endTime).toISOString().replace(/-|:|\.\d+/g, "")
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.store}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n")

    const blob = new Blob([icsContent], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.title}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast.success("Calendar file downloaded ✨")
  }

  if (!event) return <div className="p-4">Loading...</div>

  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const location = [event.city, event.region, event.country].filter(Boolean).join(", ")

  return (
    <>
      <Helmet>
        <title>{`${event.title} — Beyblade Tournament`}</title>
        <meta
          name="description"
          content={`View details for ${event.title} at ${event.store} on ${start.toLocaleDateString()}. Hosted in ${location}.`}
        />
        <meta property="og:title" content={`${event.title} — Beyblade Tournament`} />
        <meta property="og:description" content={`Join or review ${event.title} hosted by ${event.store} in ${location}.`} />
        <meta property="og:url" content={`https://www.metabeys.com/events/${event.id}`} />
        {event.imageUrl && <meta property="og:image" content={event.imageUrl} />}
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div className="p-6 max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="card-title text-3xl">{event.title}</h1>
              {isUpcoming && (
                <button className="btn btn-outline btn-sm" onClick={handleCalendar}>
                  <CalendarPlus className="w-4 h-4 mr-1" /> Add to Calendar
                </button>
              )}
            </div>

            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="rounded-lg max-h-80 w-full object-cover"
              />
            )}

            <p><strong>Date:</strong> {start.toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })}</p>

            <p><strong>Time:</strong> {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>

            {event.buyLink && (
              <a
                href={event.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm w-fit"
              >
                Buy Ticket 🎟️
              </a>
            )}

            <p><strong>Store:</strong> {event.store}</p>

            {location && (
              <p><strong>Location:</strong> {location}</p>
            )}

            {new Date(event.endTime) < new Date() && event.attendeeCount !== undefined && (
              <p><strong>Players Attended:</strong> {event.attendeeCount}</p>
            )}

            {isUpcoming && event.capacity !== undefined && (
              <p><strong>Capacity:</strong> {event.capacity} players</p>
            )}

            {event.topCut && (
              <>
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2">Top Cut Combos</h2>
                  <div className="space-y-4">
                    {event.topCut.map((player, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-base-100">
                        <p className="font-medium">{ordinal(idx + 1)} Place – {player.name}</p>
                        {player.combos?.length ? (
                          <ul className="list-disc list-inside text-sm text-neutral-content">
                            {player.combos.map((combo, i) => (
                              <li key={i}>
                                {combo.blade} / {combo.ratchet} / {combo.bit}
                                {combo.notes && (
                                  <span className="text-xs italic text-gray-400 ml-1">
                                    Note: ({combo.notes})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-error">No combos submitted.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10">
                  <BladeUsagePie players={event.topCut} />
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
