// File: src/components/HeroSlider.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import type { HomeBanner } from "../data/homeBanners" // ✅ single source of truth

export default function HeroSlider({
  banners,
  intervalMs = 6500,
}: {
  banners: HomeBanner[]
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

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <div className="relative isolate w-full overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {/* 2400x900 ratio = 8:3 */}
      <div className="relative w-full aspect-[8/3]">{children}</div>
    </div>
  )

  return (
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
              alt="Hero banner"
              className="h-full w-full object-cover"
              draggable={false}
            />

            {/* overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.35),transparent_55%)]" />

            {/* ✅ Centered Buttons ONLY (no title) */}
            {b.buttons?.length ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-4 flex-wrap items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-sm">
                  {b.buttons.map((btn, bi) => {
                    // Disabled button (Coming soon)
                    if (btn.disabled) {
                      return (
                        <div
                          key={bi}
                          className="px-6 py-3 rounded-2xl border border-white/10 bg-white/10 text-white/80 text-sm md:text-base cursor-not-allowed select-none"
                          title="Coming soon"
                        >
                          {btn.label}
                        </div>
                      )
                    }

                    // External link button
                    if (btn.external) {
                      return (
                        <a
                          key={bi}
                          href={btn.link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm md:text-base transition shadow-lg shadow-indigo-600/30"
                        >
                          {btn.label}
                        </a>
                      )
                    }

                    // Internal link button
                    return (
                      <Link
                        key={bi}
                        to={btn.link || "#"}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm md:text-base transition shadow-lg shadow-indigo-600/30"
                      >
                        {btn.label}
                      </Link>
                    )
                  })}
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
}