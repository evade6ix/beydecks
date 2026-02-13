import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import type { HomeBanner } from "../data/homeBanners"

type Props = {
  banners: HomeBanner[]
  intervalMs?: number
  height?: number // px
}

export default function HeroSlider({ banners, intervalMs = 6500, height = 360 }: Props) {
  const list = useMemo(() => (Array.isArray(banners) ? banners.filter(Boolean) : []), [banners])
  const [i, setI] = useState(0)
  const timerRef = useRef<number | null>(null)
  const hoveringRef = useRef(false)

  const count = list.length
  const safeIndex = count ? ((i % count) + count) % count : 0
  const active = count ? list[safeIndex] : null

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  const start = () => {
    stop()
    if (count <= 1) return
    timerRef.current = window.setInterval(() => {
      if (!hoveringRef.current) setI((v) => v + 1)
    }, intervalMs)
  }

  useEffect(() => {
    start()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, intervalMs])

  const go = (next: number) => setI(next)
  const prev = () => setI((v) => v - 1)
  const next = () => setI((v) => v + 1)

  if (!count) return null

  const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isExternal = !!active?.external
    const href = active?.link || "/"

    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noreferrer" style={{ display: "block" }}>
          {children}
        </a>
      )
    }

    return (
      <Link to={href} style={{ display: "block" }}>
        {children}
      </Link>
    )
  }

  return (
    <section
      onMouseEnter={() => {
        hoveringRef.current = true
      }}
      onMouseLeave={() => {
        hoveringRef.current = false
      }}
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 18,
          height,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <Wrap>
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={active?.id}
                src={active?.image}
                alt={active?.title || "banner"}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </AnimatePresence>

            {/* soft vignette + text legibility */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.35) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* title */}
            {active?.title ? (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  bottom: 16,
                  right: 18,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 14,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    textShadow: "0 10px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  {active.title}
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.22)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                  }}
                >
                  Click to view
                </div>
              </div>
            ) : null}
          </div>
        </Wrap>

        {/* arrows */}
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                prev()
              }}
              aria-label="Previous slide"
              style={arrowStyle("left")}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                next()
              }}
              aria-label="Next slide"
              style={arrowStyle("right")}
            >
              ›
            </button>
          </>
        ) : null}

        {/* dots */}
        {count > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 10,
              display: "flex",
              justifyContent: "center",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            {list.map((b, idx) => {
              const activeDot = idx === safeIndex
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={(e) => {
                    e.preventDefault()
                    go(idx)
                  }}
                  style={{
                    width: activeDot ? 26 : 10,
                    height: 10,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: activeDot ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.20)",
                    transition: "width 180ms ease, background 180ms ease",
                    cursor: "pointer",
                  }}
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(0,0,0,0.28)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 26,
    lineHeight: "42px",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  }
}