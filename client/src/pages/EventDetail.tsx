import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { CalendarPlus } from "lucide-react"
import { toast } from "react-hot-toast"
import { Helmet } from "react-helmet-async"
import BladeUsagePie from "../components/BladeUsagePie"
import { useAuth } from "../context/AuthContext" // Adjust if needed

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

interface Post {
  username: string
  content: string
  timestamp: string
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [postContent, setPostContent] = useState("")
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [submittingPost, setSubmittingPost] = useState(false)

  useEffect(() => {
    fetch(`${API}/events/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Event not found")
        const data = await res.json()
        setEvent(data)
      })
      .catch((err) => {
        console.error("Failed to load event:", err)
        toast.error("Event not found or data is invalid.")
      })
  }, [id])

  useEffect(() => {
    if (!event) return
    setLoadingPosts(true)
    fetch(`${API}/forum/${event.id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setPosts([])
          return
        }
        if (!res.ok) throw new Error("Failed to fetch posts")
        const data = await res.json()
        setPosts(data.posts || [])
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [event])

  const submitPost = async () => {
    if (!user || !postContent.trim()) return

    setSubmittingPost(true)
    const res = await fetch(`${API}/forum/${event?.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username || "Anonymous", content: postContent }),
    })
    setSubmittingPost(false)

    if (res.ok) {
      setPostContent("")
      setPosts((prev) => [
        ...prev,
        { username: user.username || "Anonymous", content: postContent, timestamp: new Date().toISOString() },
      ])
    } else {
      alert("Failed to submit post. Please try again.")
    }
  }

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
      "END:VCALENDAR",
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

      <motion.div
        className="p-6 max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
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
              <img src={event.imageUrl} alt={event.title} className="rounded-lg max-h-80 w-full object-cover" />
            )}

            <p>
              <strong>Date:</strong>{" "}
              {start.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <p>
              <strong>Time:</strong> {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
              {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>

            {event.buyLink && (
              <a href={event.buyLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm w-fit">
                Buy Ticket 🎟️
              </a>
            )}

            <p>
              <strong>Store:</strong> {event.store}
            </p>

            {location && (
              <p>
                <strong>Location:</strong> {location}
              </p>
            )}

            {new Date(event.endTime) < new Date() && event.attendeeCount !== undefined && (
              <p>
                <strong>Players Attended:</strong> {event.attendeeCount}
              </p>
            )}

            {isUpcoming && event.capacity !== undefined && (
              <p>
                <strong>Capacity:</strong> {event.capacity} players
              </p>
            )}

            {event.topCut && (
              <>
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2">Top Cut Combos</h2>
                  <div className="space-y-4">
                    {event.topCut.map((player, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-base-100">
                        <p className="font-medium">
                          {ordinal(idx + 1)} Place – {player.name}
                        </p>
                        {player.combos?.length ? (
                          <ul className="list-disc list-inside text-sm text-neutral-content">
                            {player.combos.map((combo, i) => (
                              <li key={i}>
                                {combo.blade} / {combo.ratchet} / {combo.bit}
                                {combo.notes && <span className="text-xs italic text-gray-400 ml-1">Note: ({combo.notes})</span>}
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

            {/* Forum Discussion Section */}
            <div className="mt-10 max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-lg text-gray-100">
              <h2 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-3">Event Discussion</h2>

              {loadingPosts ? (
                <p>Loading posts...</p>
              ) : posts.length === 0 ? (
                <p className="italic text-gray-400 mb-6">No posts yet. Be the first to comment!</p>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-3 mb-6">
                  {posts.map((post, i) => (
                    <article
                      key={i}
                      className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition"
                    >
                      <header className="flex justify-between mb-1">
                        <span className="font-semibold text-indigo-400">{post.username}</span>
                        <time
                          className="text-xs text-gray-400"
                          dateTime={post.timestamp}
                          title={new Date(post.timestamp).toLocaleString()}
                        >
                          {new Date(post.timestamp).toLocaleDateString()}
                        </time>
                      </header>
                      <p className="whitespace-pre-wrap text-gray-200">{post.content}</p>
                    </article>
                  ))}
                </div>
              )}

              {!user ? (
                <p className="text-center text-red-600 font-semibold">
                  You must <Link to="/user-auth" className="text-indigo-500 underline">log in</Link> to post.
                </p>
              ) : (
                <>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    placeholder="Write your message here..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    disabled={submittingPost}
                  />
                  <button
                    onClick={submitPost}
                    disabled={submittingPost || !postContent.trim()}
                    className={`mt-3 w-full py-3 rounded-md font-semibold transition ${
                      submittingPost || !postContent.trim()
                        ? "bg-indigo-700 cursor-not-allowed text-gray-400"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {submittingPost ? "Submitting..." : "Submit"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
