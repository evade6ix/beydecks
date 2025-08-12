// File: src/pages/UserPublic.tsx
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { motion } from "framer-motion"
import { Share2, MapPin, Users, ArrowLeft } from "lucide-react"

// --- API base (no double /api) ---
const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const ROOT = RAW.replace(/\/api\/?$/i, "") // strip trailing /api if present
const api = (path: string) => `${ROOT}/${String(path).replace(/^\/+/, "")}`

type OwnedParts = {
  blades: string[]
  assistBlades?: string[]
  ratchets: string[]
  bits: string[]
}

type PublicUser = {
  id: string | number
  displayName: string
  slug: string
  avatarDataUrl?: string
  bio?: string
  homeStore?: string
  ownedParts?: OwnedParts
  stats?: { tournamentsCount?: number }
}

export default function UserPublic() {
  const { slug } = useParams()
  const [u, setU] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const url = api(`/api/users/slug/${encodeURIComponent(String(slug || ""))}`)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data) => {
        if (!mounted) return
        setU(data)
      })
      .catch((e) => mounted && setError(e?.message || "Failed to load profile"))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        <div className="mt-4 h-48 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (error || !u) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-red-400">Profile not found.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Go home
        </Link>
      </div>
    )
  }

  const parts: OwnedParts = {
    blades: u.ownedParts?.blades || [],
    assistBlades: u.ownedParts?.assistBlades || [],
    ratchets: u.ownedParts?.ratchets || [],
    bits: u.ownedParts?.bits || [],
  }

  const shareUrl = `${window.location.origin}/u/${u.slug}`

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Helmet>
        <title>{u.displayName} — MetaBeys Profile</title>
        <meta name="description" content={u.bio || `${u.displayName}'s MetaBeys profile`} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:title" content={`${u.displayName} — MetaBeys Profile`} />
        <meta property="og:description" content={u.bio || ""} />
        {u.avatarDataUrl ? <meta property="og:image" content={u.avatarDataUrl} /> : null}
      </Helmet>

      {/* Header */}
      <div className="flex items-start gap-6">
        <img
          src={u.avatarDataUrl || "/default-avatar.png"}
          alt={u.displayName}
          className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/10"
          draggable={false}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">{u.displayName}</h1>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20"
              title="Copy share link"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {u.homeStore ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4" /> {u.homeStore}
            </div>
          ) : null}

          {typeof u.stats?.tournamentsCount === "number" ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
              <Users className="h-4 w-4" />
              {u.stats.tournamentsCount} tournaments played
            </div>
          ) : null}
        </div>
      </div>

      {/* Bio */}
      {u.bio ? (
        <motion.div
          className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="whitespace-pre-wrap text-white/90">{u.bio}</p>
        </motion.div>
      ) : null}

      {/* Owned parts */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <PartsCard title="Blades" items={parts.blades} />
        <PartsCard title="Assist Blades" items={parts.assistBlades || []} />
        <PartsCard title="Ratchets" items={parts.ratchets} />
        <PartsCard title="Bits" items={parts.bits} />
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}

function PartsCard({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white/80">{title}</h3>
        <p className="mt-2 text-sm text-white/50">No {title.toLowerCase()} listed yet.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-sm font-medium text-white/80">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((x, i) => (
          <li key={`${title}-${i}`} className="rounded-lg bg-white/5 px-3 py-1.5">
            {x}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
