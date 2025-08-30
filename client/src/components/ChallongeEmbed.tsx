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

  // normalize to /module and strip trailing slashes
  const normalized = url.replace(/\/+$/, "")
  const embedUrl = normalized.endsWith("/module") ? normalized : `${normalized}/module`

  // ✅ ALWAYS hit your same-origin proxy so it can fetch/patch the Challonge page
  const proxied = `/embed/challonge?url=${encodeURIComponent(embedUrl)}`

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
