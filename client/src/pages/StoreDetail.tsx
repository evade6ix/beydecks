// File: src/pages/StoreDetail.tsx
import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Store {
  id: number
  name: string
  location: string
  logo: string
  mapEmbedUrl: string
  website?: string
  notes?: string
}

export default function StoreDetail() {
  const { id } = useParams()
  const [store, setStore] = useState<Store | null>(null)

  useEffect(() => {
    fetch(`${API}/stores/${id}`)
      .then(res => res.json())
      .then(setStore)
  }, [id])

  if (!store) return <div className="p-6 text-center">Loading...</div>

  return (
    <>
      <Helmet>
        <title>{store.name} — Store Details | Meta Beys</title>
        <meta
          name="description"
          content={`Learn about ${store.name}, its location, upcoming Beyblade events, and more on Meta Beys.`}
        />
        <meta property="og:title" content={`${store.name} — Store Profile`} />
        <meta property="og:description" content={`View location, map, and upcoming tournaments for ${store.name}.`} />
        <meta property="og:image" content={store.logo} />
        <meta property="og:url" content={`https://www.metabeys.com/stores/${store.id}`} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div className="p-6 max-w-4xl mx-auto space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-4 flex-wrap">
          {store.logo && (
            <img src={store.logo} alt={store.name} className="h-16 rounded shadow" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <p className="text-neutral-content">{store.location}</p>
          </div>
        </div>

        {store.website && (
          <p>
            🌐{" "}
            <a
              href={store.website}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              Visit Website
            </a>
          </p>
        )}

        <Link
          to={`/stores/${store.id}/upcoming`}
          className="btn btn-primary btn-sm mt-2"
        >
          View Upcoming Events
        </Link>

        {store.notes && (
          <p className="text-sm text-neutral-content">📝 {store.notes}</p>
        )}

        {store.mapEmbedUrl && (
          <div
            className="w-full h-96 rounded overflow-hidden"
            dangerouslySetInnerHTML={{ __html: store.mapEmbedUrl }}
          />
        )}
      </motion.div>
    </>
  )
}
