import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { Link } from "react-router-dom"
import {
  Bot,
  ChevronRight,
  Database,
  ExternalLink,
  LoaderCircle,
  Minus,
  Send,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { METABEYS_BOT_OPEN_EVENT } from "../lib/metabeysBotEvents"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const DISMISSED_KEY = "metabeys-bot-dismissed"

type PartContext = {
  blades: string[]
  assistBlades: string[]
  ratchets: string[]
  bits: string[]
}

type BotCombo = {
  blade: string
  assistBlade?: string | null
  ratchet: string
  bit: string
  appearances?: number
  mostRecentAppearance?: string | null
}

type BotDeck = {
  title?: string | null
  combos: BotCombo[]
  grade: {
    score: number
    letter: "S" | "A" | "B" | "C" | "D"
    components: { strength: number; recency: number; diversity: number }
  }
  note?: string | null
}

type BotEvent = {
  id: string
  title: string
  store?: string
  city?: string
  region?: string
  date?: string | null
  attendeeCount?: number
  topCut: Array<{
    placement: number
    name: string
    combos: BotCombo[]
  }>
}

type BotProfile = {
  username?: string
  displayName: string
  slug: string
  url: string
}

type BotResponse = {
  type: string
  text: string
  suggestions?: string[]
  source?: string
  parts?: PartContext
  missingCategories?: string[]
  upgrades?: Array<{ category: string; name: string }>
  deck?: BotDeck
  alternatives?: BotDeck[]
  event?: BotEvent
  profile?: BotProfile
}

type ChatMessage = {
  id: string
  role: "user" | "bot"
  text: string
  response?: BotResponse
}

const emptyParts = (): PartContext => ({ blades: [], assistBlades: [], ratchets: [], bits: [] })

const initialResponse: BotResponse = {
  type: "welcome",
  text: "Hey — I’m MetaBeys Bot. I can pull the latest Top Cut, find the strongest current decks, make a completely random deck, or build a legal three-combo deck from the parts you own.",
  suggestions: [
    "Show me the latest Top Cut",
    "What is the best deck right now?",
    "Make a Random Deck",
    "Build the best deck from my parts",
    "Who is the hottest Beyblader?",
  ],
}

const messageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const formatDate = (value?: string | null) => {
  if (!value) return "Date unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const comboLabel = (combo: BotCombo) =>
  `${combo.blade}${combo.assistBlade ? ` + ${combo.assistBlade}` : ""} / ${combo.ratchet} / ${combo.bit}`

export default function MetabeysBot() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(DISMISSED_KEY) === "true"
  )
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: messageId(), role: "bot", text: initialResponse.text, response: initialResponse },
  ])
  const [parts, setParts] = useState<PartContext>(emptyParts)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const partTotal = useMemo(
    () => parts.blades.length + parts.assistBlades.length + parts.ratchets.length + parts.bits.length,
    [parts]
  )

  useEffect(() => {
    const showBot = () => {
      sessionStorage.removeItem(DISMISSED_KEY)
      setDismissed(false)
      setOpen(true)
    }
    window.addEventListener(METABEYS_BOT_OPEN_EVENT, showBot)
    return () => window.removeEventListener(METABEYS_BOT_OPEN_EVENT, showBot)
  }, [])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open, sending])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true")
    setOpen(false)
    setDismissed(true)
  }

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim()
    if (!message || sending) return

    setMessages((current) => [...current, { id: messageId(), role: "user", text: message }])
    setInput("")
    setSending(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API}/metabeys-bot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, parts }),
      })
      const data = (await response.json()) as BotResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || "MetaBeys Bot couldn't answer that.")
      if (data.parts) setParts(data.parts)
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "bot", text: data.text, response: data },
      ])
    } catch (error) {
      const text = error instanceof Error ? error.message : "MetaBeys Bot couldn't answer that."
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "bot",
          text,
          response: {
            type: "error",
            text,
            suggestions: ["Show me the latest Top Cut", "What is the best deck right now?"],
          },
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void sendMessage(input)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(input)
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-20 right-4 z-[70] sm:right-6" aria-live="polite">
      {!open && (
        <div className="group flex items-center gap-3">
          <div className="pointer-events-none hidden translate-x-2 rounded-2xl border border-white/10 bg-[#0b1020]/95 px-3.5 py-2 text-xs font-bold text-white opacity-0 shadow-2xl shadow-black/30 backdrop-blur-xl transition group-hover:translate-x-0 group-hover:opacity-100 sm:block">
            Ask MetaBeys Bot
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative grid h-16 w-16 place-items-center rounded-full border border-cyan-300/25 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-[0_18px_55px_rgba(37,99,235,0.42)] transition hover:-translate-y-1 hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/35"
            aria-label="Open MetaBeys Bot"
          >
            <span className="absolute inset-1 rounded-full border border-white/15" />
            <Bot className="relative h-7 w-7" strokeWidth={2.2} />
            <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-700 bg-emerald-400" />
          </button>
        </div>
      )}

      {open && (
        <section
          className="flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#090d18] text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
          aria-label="MetaBeys Bot chat"
        >
          <header className="relative overflow-hidden border-b border-white/[0.08] bg-[#0d1324] px-4 py-3.5">
            <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-blue-500 to-violet-700 shadow-lg shadow-blue-950/30">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-black tracking-tight">MetaBeys Bot</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live data
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/45">Tournament-grounded deck assistant</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-white/45 transition hover:bg-white/[0.07] hover:text-white"
                title="Minimize"
                aria-label="Minimize MetaBeys Bot"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="grid h-9 w-9 place-items-center rounded-xl text-white/45 transition hover:bg-rose-400/10 hover:text-rose-300"
                title="Dismiss for this session"
                aria-label="Dismiss MetaBeys Bot for this session"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 [scrollbar-color:rgba(255,255,255,0.14)_transparent]">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                onSuggestion={(suggestion) => void sendMessage(suggestion)}
              />
            ))}

            {sending && (
              <div className="flex items-end gap-2.5">
                <BotAvatar />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.055] px-4 py-3">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300"
                      style={{ animationDelay: `${dot * 140}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.08] bg-[#0b101d] p-3.5">
            <div className="mb-2 flex min-h-5 items-center justify-between gap-3 px-1 text-[10px] font-semibold text-white/35">
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" /> Grounded in MetaBeys results
              </span>
              {partTotal > 0 && <span className="text-cyan-300/80">Remembering {partTotal} parts</span>}
            </div>
            <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5 focus-within:border-blue-400/40 focus-within:ring-4 focus-within:ring-blue-500/10">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                rows={1}
                maxLength={1200}
                placeholder="Ask about results, decks, or your parts…"
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-white outline-none placeholder:text-white/25"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-white/25 disabled:shadow-none"
                aria-label="Send message"
              >
                {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            {isAuthenticated && messages.length === 1 && (
              <button
                type="button"
                onClick={() => void sendMessage("Build the best deck from my saved collection")}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.06] px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/[0.1]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Use my saved collection
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function BotAvatar() {
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-blue-300/15 bg-gradient-to-br from-blue-500 to-violet-700">
      <Bot className="h-3.5 w-3.5" />
    </div>
  )
}

function ChatBubble({
  message,
  onSuggestion,
}: {
  message: ChatMessage
  onSuggestion: (suggestion: string) => void
}) {
  const isUser = message.role === "user"
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <BotAvatar />}
      <div className={`flex max-w-[calc(100%_-_2.4rem)] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${
            isUser
              ? "rounded-br-md bg-blue-600 text-white shadow-lg shadow-blue-950/20"
              : "rounded-bl-md border border-white/[0.08] bg-white/[0.055] text-white/80"
          }`}
        >
          <MessageText text={message.text} />
        </div>
        {!isUser && message.response && (
          <ResponseDetails response={message.response} onSuggestion={onSuggestion} />
        )}
      </div>
    </div>
  )
}

function ResponseDetails({
  response,
  onSuggestion,
}: {
  response: BotResponse
  onSuggestion: (suggestion: string) => void
}) {
  const hasParts = response.parts && Object.values(response.parts).some((values) => values.length > 0)
  return (
    <div className="mt-2.5 space-y-2.5">
      {response.event && <EventCard event={response.event} />}
      {response.deck && <DeckCard deck={response.deck} />}
      {response.profile && <ProfileCard profile={response.profile} />}
      {response.alternatives && response.alternatives.length > 0 && (
        <details className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
          <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.1em] text-white/45">
            {response.alternatives.length} alternative deck{response.alternatives.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2.5 space-y-2">
            {response.alternatives.map((deck, deckIndex) => (
              <div key={`${deck.grade.score}-${deckIndex}`} className="rounded-xl border border-white/[0.06] bg-black/15 p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.08em] text-white/30">
                  <span>Alternative {deckIndex + 1}</span>
                  <span className="text-cyan-200/60">{deck.grade.letter} · {deck.grade.score}/100</span>
                </div>
                {deck.combos.map((combo) => (
                  <div key={comboLabel(combo)} className="truncate text-[9px] leading-4 text-white/55">{comboLabel(combo)}</div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}
      {hasParts && response.parts && <PartsSummary parts={response.parts} />}
      {response.upgrades && response.upgrades.length > 0 && (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200/75">Best additions</div>
          <div className="flex flex-wrap gap-1.5">
            {response.upgrades.map((upgrade) => (
              <span key={`${upgrade.category}-${upgrade.name}`} className="rounded-lg border border-amber-200/10 bg-black/15 px-2 py-1 text-[10px] text-amber-100">
                {upgrade.name} <span className="text-amber-100/40">· {upgrade.category}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {response.type === "login_required" && (
        <Link to="/user-auth" className="flex items-center justify-between rounded-xl border border-blue-300/15 bg-blue-400/[0.08] px-3 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-400/[0.13]">
          Sign in to MetaBeys <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {response.source && (
        <div className="flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/25">
          <Database className="h-3 w-3" /> {response.source}
        </div>
      )}
      {response.suggestions && response.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {response.suggestions.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="rounded-xl border border-blue-300/10 bg-blue-400/[0.055] px-2.5 py-1.5 text-left text-[10px] font-bold leading-4 text-blue-200/85 transition hover:border-blue-300/20 hover:bg-blue-400/[0.1]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s.,!?;:]+)/g)
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-cyan-200 underline decoration-cyan-200/30 underline-offset-2 hover:text-cyan-100"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  )
}

function ProfileCard({ profile }: { profile: BotProfile }) {
  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/[0.1] to-violet-500/[0.05] p-3 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-400/[0.12]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-fuchsia-200/15 bg-fuchsia-300/10 text-fuchsia-200">
        <UserRound className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-fuchsia-200/55">Today's pick</div>
        <div className="truncate text-xs font-black text-white">{profile.displayName}</div>
        {profile.username && <div className="truncate text-[10px] text-white/35">@{profile.username}</div>}
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-white/35" />
    </a>
  )
}

function EventCard({ event }: { event: BotEvent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] to-orange-400/[0.03]">
      <div className="border-b border-white/[0.07] p-3">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-black leading-4 text-white">{event.title}</h3>
            <p className="mt-1 text-[10px] text-white/40">
              {formatDate(event.date)}{event.store ? ` · ${event.store}` : ""}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {event.topCut.slice(0, 4).map((player) => (
          <div key={`${player.placement}-${player.name}`} className="flex items-start gap-2 text-[10px]">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md font-black ${player.placement === 1 ? "bg-amber-300 text-amber-950" : "bg-white/[0.07] text-white/45"}`}>
              {player.placement}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-white/85">{player.name}</div>
              {player.combos[0] && <div className="truncate text-white/35">{comboLabel(player.combos[0])}</div>}
            </div>
          </div>
        ))}
        {event.id && (
          <Link to={`/events/${event.id}`} className="mt-2 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2 text-[10px] font-bold text-white/65 transition hover:bg-white/[0.06] hover:text-white">
            View full Top Cut <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

function DeckCard({ deck }: { deck: BotDeck }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-blue-500/[0.11] via-cyan-300/[0.045] to-violet-500/[0.08]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] p-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-lg font-black text-cyan-200">
          {deck.grade.letter}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black text-white">{deck.title || "Recommended deck"}</div>
          <div className="mt-0.5 text-[10px] text-white/40">{deck.note || "MetaBeys recommendation"}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-white">{deck.grade.score}<span className="text-[9px] text-white/30">/100</span></div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-cyan-200/55">Deck score</div>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {deck.combos.map((combo, index) => (
          <div key={`${comboLabel(combo)}-${index}`} className="rounded-xl border border-white/[0.06] bg-black/15 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25">Combo {index + 1}</span>
              {typeof combo.appearances === "number" && (
                <span className="text-[9px] font-bold text-cyan-200/50">{combo.appearances} appearances</span>
              )}
            </div>
            <div className="text-[11px] font-bold leading-4 text-white/85">
              {combo.blade}
              {combo.assistBlade && <span className="text-cyan-200"> + {combo.assistBlade}</span>}
            </div>
            <div className="text-[10px] text-white/40">{combo.ratchet} / {combo.bit}</div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {([
            ["Strength", deck.grade.components.strength],
            ["Recency", deck.grade.components.recency],
            ["Diversity", deck.grade.components.diversity],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-2 text-center">
              <div className="text-[11px] font-black text-white/80">{value}</div>
              <div className="text-[8px] font-bold uppercase tracking-[0.08em] text-white/25">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PartsSummary({ parts }: { parts: PartContext }) {
  const groups = [
    ["Blades", parts.blades],
    ["Assist", parts.assistBlades],
    ["Ratchets", parts.ratchets],
    ["Bits", parts.bits],
  ] as const
  const total = groups.reduce((sum, [, values]) => sum + values.length, 0)
  return (
    <details className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
      <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.1em] text-white/45">
        Using {total} recognized part{total === 1 ? "" : "s"}
      </summary>
      <div className="mt-2.5 space-y-2">
        {groups.filter(([, values]) => values.length > 0).map(([label, values]) => (
          <div key={label}>
            <div className="mb-1 text-[9px] font-bold text-white/25">{label}</div>
            <div className="flex flex-wrap gap-1">
              {values.slice(0, 12).map((value) => (
                <span key={value} className="rounded-md bg-black/20 px-1.5 py-1 text-[9px] text-white/60">{value}</span>
              ))}
              {values.length > 12 && <span className="px-1 py-1 text-[9px] text-white/30">+{values.length - 12}</span>}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
