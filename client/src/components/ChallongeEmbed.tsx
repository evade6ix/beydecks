// File: src/components/ChallongeEmbed.tsx
import React from "react"

interface ChallongeEmbedProps {
  url: string // can be Challonge link or slug
  height?: number
}

// derive backend base (strip /api if VITE_API_URL ends with it)
const RAW_API = import.meta.env.VITE_API_URL || window.location.origin
const API_BASE = RAW_API.replace(/\/api\/?$/, "").replace(/\/+$/, "")

const ChallongeEmbed: React.FC<ChallongeEmbedProps> = ({ url, height = 500 }) => {
  if (!url) {
    return <div className="text-sm text-white/60">No Challonge bracket URL provided.</div>
  }

  // normalize to /module
  const embedUrl = url.endsWith("/module") ? url : `${url.replace(/\/+$/, "")}/module`

  // hit your backend proxy instead of Challonge directly
  const proxied = `${API_BASE}/embed/challonge?url=${encodeURIComponent(embedUrl)}`

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
