import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Trophy, MapPin, CalendarCheck, List } from "lucide-react"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

type Player = { name: string; combos?: { blade: string; assistBlade?: string; ratchet: string; bit: string }[] }
type EventItem = {
  id: number | string
  title: string
  startTime: string
  endTime: string
  store: string
  topCut?: Player[]
}
type ProductItem = { id: number | string; title: string; imageUrl?: string }

const trophyIcons = ["🥇", "🥈", "🥉"]

export default function Home() {
  const [upcoming, setUpcoming] = useState<EventItem | null>(null)
  const [recent, setRecent] = useState<EventItem[]>([])
  const [topCombos, setTopCombos] = useState<{ blade: string; count: number }[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsRes, productsRes] = await Promise.all([
          fetch(`${API}/events`),
          fetch(`${API}/products`)
        ])
        const [eventsData, productsData] = await Promise.all([
          eventsRes.json(),
          productsRes.json()
        ])

        const now = new Date()

        const futureEvents: EventItem[] = (eventsData as EventItem[])
          .filter(e => new Date(e.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        const completedEvents: EventItem[] = (eventsData as EventItem[])
          .filter(e => new Date(e.endTime) < now)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setUpcoming(futureEvents[0] || null)
        setRecent(completedEvents.slice(0, 3))

        // Build top blades from completed events
        const bladeMap: Record<string, number> = {}
        for (const event of completedEvents) {
          for (const player of event.topCut ?? []) {
            for (const combo of player.combos ?? []) {
              if (combo.blade) bladeMap[combo.blade] = (bladeMap[combo.blade] || 0) + 1
            }
          }
        }
        const sortedBlades = Object.entries(bladeMap)
          .map(([blade, count]) => ({ blade, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)

        setTopCombos(sortedBlades)
        setProducts((productsData as ProductItem[]).slice(0, 3))
      } catch {
        // swallow for now; you can toast here if you want
      }
    }
    load()
  }, [])

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      }),
    []
  )

  return (
    <>
      <Helmet>
        <title>Meta Beys — Competitive Beyblade X Tracker & Events</title>
        <meta
          name="description"
          content="Track top Beyblade X combos, find tournaments, and explore stores and product links across North America. Stay on top of the competitive scene."
        />
        <meta name="keywords" content="Beyblade X, Beyblade tournaments, meta combos, beyblade parts, top blades, beyblade events, competitive beyblade" />
        <meta property="og:title" content="Meta Beys — Competitive Beyblade X Tracker" />
        <meta property="og:description" content="Discover Beyblade tournaments, track top blades, and explore products. Your hub for the competitive Beyblade X scene." />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta property="og:image" content="https://www.metabeys.com/favicon.png" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div
        className="p-6 max-w-5xl mx-auto space-y-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Welcome to the Meta Beys Portal</h1>
          <p className="text-lg text-neutral-content">
            Discover local tournaments, track Meta Combos & stay informed about competitive Beyblade!
          </p>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Link to="/events" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <CalendarCheck className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center whitespace-nowrap">Upcoming Events</h2>
            </div>
          </Link>
          <Link to="/events/completed" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <List className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center whitespace-nowrap">Completed Events</h2>
            </div>
          </Link>
          <Link to="/stores" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <MapPin className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center whitespace-nowrap">Store Finder</h2>
            </div>
          </Link>
          <Link to="/leaderboard" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <Trophy className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center whitespace-nowrap">Meta</h2>
            </div>
          </Link>
        </div>

        {/* Tournament Lab */}
        <div className="card bg-base-200 p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Tournament Lab</h2>
          <p className="text-sm text-neutral-content mb-4">
            Curious how your combo would perform in real events? Test it against actual tournament data to see how often it appears in top cut results.
          </p>
          <div className="flex justify-center mt-4">
            <Link to="/tournament-lab" className="btn btn-accent btn-sm whitespace-nowrap">
              Try Tournament Lab
            </Link>
          </div>
        </div>

        {/* Products */}
        <div className="card bg-base-200 p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Shop Beyblade Products</h2>
          <p className="text-sm text-neutral-content mb-4">Explore all Beyblade Products & Vendors!</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {products.map(product => (
              <div key={product.id} className="bg-base-100 p-3 rounded shadow flex flex-col items-center">
                <img
                  src={product.imageUrl || "/placeholder.svg"}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-36 object-contain mb-2"
                />
                <h3 className="text-sm font-medium mb-2 text-center">{product.title}</h3>
                <button
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="btn btn-outline btn-sm w-full mt-auto whitespace-nowrap"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-2">
            <Link to="/shop" className="btn btn-primary btn-sm whitespace-nowrap">
              Browse All Products
            </Link>
          </div>
        </div>

        {/* Meta + Next Event */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div className="card bg-base-200 p-4 text-center">
            <h2 className="text-xl font-semibold mb-2">Top Meta Blades</h2>
            <ul className="text-sm space-y-1">
              {topCombos.length ? (
                topCombos.map((item, i) => (
                  <li key={i}>
                    {i + 1}. <strong>{item.blade}</strong> — {item.count} uses
                  </li>
                ))
              ) : (
                <li className="text-neutral-content">No data yet.</li>
              )}
            </ul>
          </div>

          <div className="card bg-base-200 p-4 text-center">
            <h2 className="text-xl font-semibold mb-2">Next Event</h2>
            {upcoming ? (
              <>
                <h3 className="text-lg font-bold">{upcoming.title}</h3>
                <p className="text-sm text-neutral-content">
                  {fmt.format(new Date(upcoming.startTime))} @ {upcoming.store}
                </p>
                <div className="flex justify-center mt-3">
                  <Link to={`/events/${upcoming.id}`} className="btn btn-primary btn-sm whitespace-nowrap">
                    View Details
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm">No upcoming events found.</p>
            )}
          </div>
        </div>

        {/* Recent Completed */}
        <div className="card bg-base-200 p-4 text-center">
          <h2 className="text-xl font-semibold mb-4">✅ Recent Completed Events</h2>
          {recent.length ? (
            recent.map(event => (
              <div key={event.id} className="mb-4">
                <Link to={`/events/${event.id}`} className="text-lg font-bold link link-hover">
                  {event.title}
                </Link>
                <p className="text-sm text-neutral-content mb-1">
                  {fmt.format(new Date(event.endTime))} @ {event.store}
                </p>
                <ul className="text-sm space-y-1">
                  {event.topCut?.slice(0, 3).map((player, i) => (
                    <li key={player.name + i}>
                      {(trophyIcons[i] as string) || "•"} <strong>{player.name}</strong>
                    </li>
                  )) || <li className="text-neutral-content">No top cut posted.</li>}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-content">No completed events yet.</p>
          )}
        </div>

        <div className="mt-12 text-center space-y-2 opacity-60">
          <p className="text-sm font-medium">Metabeys is owned by @Aysus and @Karl6ix</p>
        </div>
      </motion.div>
    </>
  )
}
