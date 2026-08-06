import * as React from "react"
import { X } from "lucide-react"

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ")

const BOUNTY_PHRASE = "Win a WBO with Gear Rush"

function formatBannerTitle(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    const corrected = node.replace("MYSTERY BOUNT:", "MYSTERY BOUNTY:")
    const phraseIndex = corrected.indexOf(BOUNTY_PHRASE)

    if (phraseIndex === -1) return corrected

    return (
      <>
        {corrected.slice(0, phraseIndex)}
        <span className="mx-0.5 inline-block rounded-md border border-green-700/30 bg-green-700/10 px-1.5 py-0.5 font-bold text-green-950">
          {BOUNTY_PHRASE}
        </span>
        {corrected.slice(phraseIndex + BOUNTY_PHRASE.length)}
      </>
    )
  }

  if (Array.isArray(node)) {
    return node.map(formatBannerTitle)
  }

  if (!React.isValidElement(node)) return node

  const element = node as React.ReactElement<{ children?: React.ReactNode }>
  if (element.props.children === undefined) return element

  return React.cloneElement(
    element,
    undefined,
    formatBannerTitle(element.props.children),
  )
}

function Grid({
  cellSize = 12,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  cellSize?: number
  strokeWidth?: number
  patternOffset?: [number, number]
  className?: string
}) {
  const id = React.useId()

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 text-black/10",
        className,
      )}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  )
}

interface BannerProps {
  show: boolean
  onHide: () => void
  icon?: React.ReactNode
  title: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  learnMoreUrl?: string
}

export function Banner({
  show,
  onHide,
  icon,
  title,
  action,
  learnMoreUrl,
}: BannerProps) {
  if (!show) return null

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-green-600/15 bg-gradient-to-r from-lime-100/80 to-emerald-100/80 px-4 py-3 sm:px-6">
      <Grid
        cellSize={13}
        patternOffset={[0, -1]}
        className="text-black/30 mix-blend-overlay [mask-image:linear-gradient(to_right,black,transparent)] md:[mask-image:linear-gradient(to_right,black_60%,transparent)]"
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:flex-wrap">
        <div className="flex items-center justify-center gap-3 text-center">
          {icon && (
            <div className="hidden rounded-full border border-green-600/50 bg-white/50 p-1 shadow-[inset_0_0_1px_1px_#fff] sm:block">
              {icon}
            </div>
          )}

          <p className="text-sm text-gray-900">
            {formatBannerTitle(title)}
            {learnMoreUrl && (
              <>
                {" "}
                <a
                  href={learnMoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-700 underline transition-colors hover:text-black"
                >
                  Learn more
                </a>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {action && (
            <button
              type="button"
              className="whitespace-nowrap rounded-md border border-green-700/50 px-3 py-1 text-sm text-gray-800 transition-colors hover:bg-green-500/10"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-1 text-green-700 transition-colors hover:bg-green-500/10 hover:text-green-900"
            onClick={onHide}
            aria-label="Close banner"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )
}