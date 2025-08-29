// File: src/components/ChallongeEmbed.tsx
import React from "react"

interface ChallongeEmbedProps {
  url: string // e.g. "https://challonge.com/ayjt40cu"
  height?: number
}

const ChallongeEmbed: React.FC<ChallongeEmbedProps> = ({ url, height = 500 }) => {
  // Challonge requires /module at the end for embeds
  const embedUrl = url.endsWith("/module") ? url : `${url}/module`

  return (
    <iframe
      src={embedUrl}
      width="100%"
      height={height}
      frameBorder={0}
      scrolling="auto"
      allowTransparency={true}
      title="Challonge Bracket"
    />
  )
}

export default ChallongeEmbed
