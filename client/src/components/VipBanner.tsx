// File: src/components/VipBanner.tsx
import React from "react"

interface VipBannerProps {
  children: React.ReactNode
}

export default function VipBanner({ children }: VipBannerProps) {
  return (
    <div className="relative rounded-3xl overflow-hidden">

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-pulse opacity-20 blur-xl" />

      {/* Premium Frame Border */}
      <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-600">
        <div className="absolute inset-0 rounded-3xl border-2 border-yellow-300/40 shadow-[0_0_25px_rgba(255,200,0,0.6)]" />
      </div>

      {/* Decorative Corners (inline SVG, no image files needed) */}
      <svg
        className="absolute top-0 left-0 w-24 h-24 opacity-80"
        viewBox="0 0 100 100"
      >
        <polygon
          points="0,0 100,0 0,100"
          fill="url(#goldGrad)"
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff5b0" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="absolute bottom-0 right-0 w-24 h-24 opacity-80 rotate-180"
        viewBox="0 0 100 100"
      >
        <polygon
          points="0,0 100,0 0,100"
          fill="url(#goldGrad2)"
        />
        <defs>
          <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff5b0" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>

      {/* VIP Badge */}
      <div className="absolute top-4 right-4 z-20">
        <div className="px-3 py-1 text-xs font-bold tracking-widest uppercase rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-black shadow-lg">
          VIP
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
