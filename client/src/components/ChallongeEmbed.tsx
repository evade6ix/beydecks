// File: src/components/ChallongeEmbed.tsx
import React from "react"

interface ChallongeEmbedProps {
  url: string // challonge link or slug
  height?: number
}

const ChallongeEmbed: React.FC<ChallongeEmbedProps> = ({ url, height = 500 }) => {
  if (!url) {
    return <div className="text-sm text-white/60">No Challonge bracket URL provided.</div>
  }

  // Normalize challonge input → ensure single /module, strip trailing slashes
  const normalized = url.replace(/\/+$/, "")
  const embedUrl = normalized.endsWith("/module") ? normalized : `${normalized}/module`

  // IMPORTANT: use backend origin (not a relative path) and strip a trailing "/api"
  const raw = import.meta.env.VITE_API_URL?.replace(/\/+$/, "")
  const API_ORIGIN = raw ? raw.replace(/\/api$/i, "") : window.location.origin

  const proxied = `${API_ORIGIN}/embed/challonge?url=${encodeURIComponent(embedUrl)}`

  return (
    <iframe
      src={proxied}
      width="100%"
      height={height}
      frameBorder={0}
      scrolling="auto"
      allowTransparency
      title="Challonge Bracket"
      style={{ borderRadius: 8, background: "transparent" }}
    />
  )
}

export default ChallongeEmbed
