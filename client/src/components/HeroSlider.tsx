// File: src/components/HeroSlider.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

type HomeBanner = {
  id: string
  image: string
  link: string
  external?: boolean
  title?: string
}

export default function HeroSlider({
  banners,
  height = 360,
  intervalMs = 6500,
}: {
  banners: HomeBanner[]
  height?: number
  intervalMs?: number
}) {
  const safe = useMemo(() => (Array.isArray(banners) ? banners.filter(Boolean) : []), [banners])
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<number | null>(null)

  // Keep idx in range if banners change
  useEffect(() => {
    if (!safe.length) return
    setIdx(i => (i >= safe.length ? 0 : i))
  }, [safe.length])

  // Preload images to prevent flashing
  useEffect(() => {
    for (const b of safe) {
      const img = new Image()
      img.src = b.image
    }
  }, [safe])

  // Auto-advance ONLY if more than 1 banner
  useEffect(() => {
    if (safe.length <= 1) return

    // clear any existing timer
    if (timerRef.current) window.clearInterval(timerRef.current)

    timerRef.current = window.setInterval(() => {
      setIdx(i => (i + 1) % safe.length)
    }, Math.max(2000, intervalMs))

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [safe.length, intervalMs])

  if (!safe.length) return null

  const active = safe[idx]

  const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative isolate w-full overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    {/* 2400x900 ratio = 8:3 */}
    <div className="relative w-full aspect-[8/3]">
      {children}
    </div>
  </div>
)
  const Inner = (
    <Frame>
      {/* Slides (never unmount -> no flicker) */}
      <div className="absolute inset-0">
        {safe.map((b, i) => (
          <div
            key={b.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: i === idx ? 1 : 0 }}
          >
            <img
              src={b.image}
              alt={b.title || "Hero banner"}
              className="h-full w-full object-cover"
              draggable={false}
            />

            {/* overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.35),transparent_55%)]" />

            {b.title ? (
              <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-8 md:bottom-7">
                <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/35 px-4 py-2 backdrop-blur-sm">
                  <div className="text-base md:text-lg font-semibold text-white">{b.title}</div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* subtle highlight ring */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
    </Frame>
  )

  // Click behavior
  if (active.external) {
    return (
      <a href={active.link} target="_blank" rel="noreferrer" className="block">
        {Inner}
      </a>
    )
  }

  return (
    <Link to={active.link} className="block">
      {Inner}
    </Link>
  )
}