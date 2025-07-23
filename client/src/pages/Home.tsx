// File: src/pages/Home.tsx
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Trophy, MapPin, CalendarCheck, List } from "lucide-react"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

const trophyIcons = ["🥇", "🥈", "🥉"]

export default function Home() {
  const [upcoming, setUpcoming] = useState<any | null>(null)
  const [recent, setRecent] = useState<any[]>([])
  const [topCombos, setTopCombos] = useState<{ blade: string; count: number }[]>([])
  const [products, setProducts] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data) => {
        const now = new Date()
        const futureEvents = data
          .filter((e: any) => new Date(e.startTime) > now)
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        const upcomingEvent = futureEvents[0] || null
        const completedEvents = data
          .filter((e: any) => new Date(e.endTime) < now)
          .sort((a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setUpcoming(upcomingEvent)
        setRecent(completedEvents.slice(0, 3))

        const bladeMap: Record<string, number> = {}
        completedEvents.forEach((event: any) => {
          event.topCut?.forEach((player: any) => {
            player.combos?.forEach((combo: any) => {
              if (combo.blade) {
                bladeMap[combo.blade] = (bladeMap[combo.blade] || 0) + 1
              }
            })
          })
        })

        const sortedBlades = Object.entries(bladeMap)
          .map(([blade, count]) => ({ blade, count }))
          .sort((a, b) => b.count - a.count)

        setTopCombos(sortedBlades.slice(0, 3))
      })

    fetch(`${API}/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.slice(0, 3))
      })
  }, [])

  return (
    <>
      <Helmet>
        <title>Meta Beys — Competitive Beyblade X Tracker & Events</title>
        <meta name="description" content="Track top Beyblade X combos, find tournaments, and explore stores and product links across North America. Stay on top of the competitive scene." />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Link to="/events" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <CalendarCheck className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center">Upcoming Events</h2>
            </div>
          </Link>
          <Link to="/events/completed" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <List className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center">Completed Events</h2>
            </div>
          </Link>
          <Link to="/stores" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <MapPin className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center">Store Finder</h2>
            </div>
          </Link>
          <Link to="/leaderboard" className="card bg-base-200 hover:shadow-xl transition">
            <div className="card-body items-center">
              <Trophy className="w-8 h-8 mb-2" />
              <h2 className="card-title text-center">Meta</h2>
            </div>
          </Link>
        </div>

        <div className="card bg-base-200 p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">🔬 Tournament Lab</h2>
          <p className="text-sm text-neutral-content mb-4">
            Curious how your combo would perform in real events? Test it against actual tournament data to see how often it appears in top cut results.
          </p>
          <div className="flex justify-center mt-4">
            <Link to="/tournament-lab" className="btn btn-accent btn-sm">
              Try Tournament Lab
            </Link>
          </div>
        </div>

        <div className="card bg-base-200 p-6 text-center">
          <h2 className="text-2xl font-bold mb-2"> Shop Beyblade Products</h2>
          <p className="text-sm text-neutral-content mb-4">
            Explore all Beyblade Products & Vendors!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {products.map(product => (
              <div
                key={product.id}
                className="bg-base-100 p-3 rounded shadow flex flex-col items-center"
              >
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-36 object-contain mb-2"
                />
                <h3 className="text-sm font-medium mb-2 text-center">{product.title}</h3>
                <button
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="btn btn-outline btn-sm w-full mt-auto"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-2">
            <Link to="/shop" className="btn btn-primary btn-sm">
              Browse All Products
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div className="card bg-base-200 p-4 text-center">
            <h2 className="text-xl font-semibold mb-2">🧠 Top Meta Blades</h2>
            <ul className="text-sm space-y-1">
              {topCombos.map((item, i) => (
                <li key={i}>
                  {i + 1}. <strong>{item.blade}</strong> — {item.count} uses
                </li>
              ))}
            </ul>
          </div>

          <div className="card bg-base-200 p-4 text-center">
            <h2 className="text-xl font-semibold mb-2">📅 Next Event</h2>
            {upcoming ? (
              <>
                <h3 className="text-lg font-bold">{upcoming.title}</h3>
                <p className="text-sm text-neutral-content">
                  {new Date(upcoming.startTime).toLocaleDateString()} @ {upcoming.store}
                </p>
                <div className="flex justify-center mt-3">
                  <Link to={`/events/${upcoming.id}`} className="btn btn-primary btn-sm">
                    View Details
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm">No upcoming events found.</p>
            )}
          </div>
        </div>

        <div className="card bg-base-200 p-4 text-center">
          <h2 className="text-xl font-semibold mb-4">✅ Recent Completed Events</h2>
          {recent.map(event => (
            <div key={event.id} className="mb-4">
              <Link to={`/events/${event.id}`} className="text-lg font-bold link link-hover">
                {event.title}
              </Link>
              <p className="text-sm text-neutral-content mb-1">
                {new Date(event.endTime).toLocaleDateString()} @ {event.store}
              </p>
              <ul className="text-sm space-y-1">
                {event.topCut?.slice(0, 3).map((player: any, i: number) => (
                  <li key={i}>{trophyIcons[i] || "•"} <strong>{player.name}</strong></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center space-y-2 opacity-60">
  <img src="/game3-logo.png" alt="Game 3 Logo" className="mx-auto h-12" />
  <p className="text-sm font-medium">Meta Beys is a Game 3 Company</p>
  <p className="text-xs text-accent font-semibold">🚀 Test Launch</p>
</div>

      </motion.div>
    </>
  )
}
