// File: client/src/pages/SubmitEvent.tsx
import { useRef, useState } from "react"
import { motion } from "framer-motion"
import toast from "react-hot-toast"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"
const API_ORIGIN = (API.replace(/\/+$/, "")).replace(/\/api$/i, "")

// Accepts: plain slug (e.g. "ayjt40cu"), a full URL, or a pasted <iframe ...>.
// - forces https
// - ensures exactly one /module at the end
// - PRESERVES any query string (?theme=1&scale_to_fit=1)
// Returns "" if it’s not recognizably Challonge.
function normalizeChallongeInput(input: string): string {
  if (!input) return ""
  let raw = input.trim()

  // If they pasted the full <iframe ...>, extract src
  if (raw.startsWith("<iframe")) {
    const m = raw.match(/\ssrc=["']([^"']+)["']/i)
    if (m?.[1]) raw = m[1].trim()
  }

  // If it looks like a URL, normalize it
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (!/^(?:www\.)?challonge\.com$/i.test(u.hostname)) return ""
      u.protocol = "https:"
      const basePath = u.pathname.replace(/\/+$/, "")
      u.pathname = basePath.endsWith("/module") ? basePath : `${basePath}/module`
      u.hash = ""
      return u.toString()
    } catch {
      return ""
    }
  }

  // Otherwise treat as a slug
  const slug = raw.replace(/[^a-z0-9-_]/gi, "")
  if (!slug) return ""
  return `https://challonge.com/${slug}/module`
}

interface Player {
  name: string
  combos: Combo[]
}

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
  notes?: string
}

type UserHit = {
  id: string
  username: string
  displayName?: string
  slug?: string
  avatarDataUrl?: string
}

export default function SubmitEvent() {
  // Event fields (1:1 with Admin)
  const [title, setTitle] = useState("")
  const [buyLink, setBuyLink] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [capacity, setCapacity] = useState<number | undefined>()
  const [attendeeCount, setAttendeeCount] = useState<number | undefined>()
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [store, setStore] = useState("")
  const [country, setCountry] = useState("")
  const [region, setRegion] = useState("")
  const [city, setCity] = useState("")
  const [challongeUrl, setChallongeUrl] = useState("")
  const [topCut, setTopCut] = useState<Player[]>([])

  // Suggestions (kept identical so it feels 1:1)
  const [nameSuggestions, setNameSuggestions] = useState<UserHit[][]>([])
  const timersRef = useRef<number[]>([])

  const resetForm = () => {
    setTitle("")
    setStartTime("")
    setEndTime("")
    setStore("")
    setTopCut([])
    setBuyLink("")
    setImageUrl("")
    setCapacity(undefined)
    setAttendeeCount(undefined)
    setCountry("")
    setRegion("")
    setCity("")
    setChallongeUrl("")
    setNameSuggestions([])
    timersRef.current = []
  }

  const addCombo = (playerIndex: number) => {
    setTopCut(prev => {
      const updated = [...prev]
      updated[playerIndex] = {
        ...updated[playerIndex],
        combos: [...updated[playerIndex].combos, { blade: "", ratchet: "", bit: "", notes: "" }]
      }
      return updated
    })
  }

  const updateTopCutCombo = (p: number, c: number, f: keyof Combo, val: string) => {
    setTopCut(prev => {
      const copy = [...prev]
      copy[p].combos[c][f] = val
      return copy
    })
  }

  const addTopCutPlayer = () => {
    setTopCut(prev => [
      ...prev,
      { name: "", combos: [{ blade: "", ratchet: "", bit: "", notes: "" }] }
    ])
    setNameSuggestions(prev => [...prev, []])
    timersRef.current.push(0)
  }

  const removeTopCutPlayer = (i: number) => {
    setTopCut(prev => prev.filter((_, idx) => idx !== i))
    setNameSuggestions(prev => prev.filter((_, idx) => idx !== i))
    timersRef.current.splice(i, 1)
  }

  const updatePlayerName = (i: number, val: string) => {
    setTopCut(prev => {
      const copy = [...prev]
      copy[i].name = val
      return copy
    })
  }

  const fetchNameSuggestions = async (i: number, q: string) => {
    try {
      const res = await fetch(`${API}/users/search?q=${encodeURIComponent(q)}`)
      const data: UserHit[] = res.ok ? await res.json() : []
      setNameSuggestions(prev => {
        const copy = [...prev]
        copy[i] = data
        return copy
      })
    } catch {
      setNameSuggestions(prev => {
        const copy = [...prev]
        copy[i] = []
        return copy
      })
    }
  }

  const handlePlayerNameChange = (i: number, val: string) => {
    updatePlayerName(i, val)
    if (timersRef.current[i]) window.clearTimeout(timersRef.current[i])

    const q = val.trim()
    if (q.length < 2) {
      setNameSuggestions(prev => {
        const copy = [...prev]
        copy[i] = []
        return copy
      })
      return
    }

    timersRef.current[i] = window.setTimeout(() => fetchNameSuggestions(i, q), 250)
  }

  const selectSuggestedUser = (i: number, u: UserHit) => {
    setTopCut(prev => {
      const copy: any[] = [...(prev as any)]
      copy[i].name = u.username
      ;(copy[i] as any).userSlug = u.slug || ""
      ;(copy[i] as any).userId = u.id
      return copy as Player[]
    })
    setNameSuggestions(prev => {
      const copy = [...prev]
      copy[i] = []
      return copy
    })
  }

  // Submit to backend for admin review
const submitEventForReview = async () => {
  try {
    const normalizedChallonge = normalizeChallongeInput(challongeUrl)

    const payload = {
      title,
      startTime,
      endTime,
      store,
      topCut,
      buyLink,
      imageUrl,
      capacity,
      attendeeCount,
      country,
      region,
      city,
      challongeUrl: normalizedChallonge || undefined
    }

    const res = await fetch(`${API}/event-submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.error(data?.error || "Submission failed")
      return
    }

    toast.success("Submitted! Admin will review it.")
    resetForm()
  } catch {
    toast.error("Submission failed (network error)")
  }
}


  return (
    <motion.div className="p-6 max-w-5xl mx-auto space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Submit a Tournament</h1>
      <p className="opacity-70 -mt-2">
        Submit an event + top cut combos for admin review. Once approved, it becomes a real event.
      </p>

      <div className="card bg-base-200 p-4 space-y-4">
        <h2 className="text-xl font-bold">Event Submission</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input className="input input-bordered" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input input-bordered" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          <input className="input input-bordered" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
          <input className="input input-bordered" placeholder="Store" value={store} onChange={e => setStore(e.target.value)} />
        </div>

        <input className="input input-bordered" placeholder="Buy Ticket URL" value={buyLink} onChange={e => setBuyLink(e.target.value)} />

        <input
          className="input input-bordered"
          type="url"
          placeholder='Challonge URL, slug, or iframe (e.g. "https://challonge.com/ayjt40cu" or "ayjt40cu")'
          value={challongeUrl}
          onChange={e => setChallongeUrl(e.target.value)}
        />
        <p className="text-xs opacity-70 -mt-2">
          Paste the tournament link (or slug). We’ll normalize it and show the bracket on the event’s Bracket tab.
        </p>

        {normalizeChallongeInput(challongeUrl) ? (
          <div className="rounded-lg border border-base-300 p-2">
            <div className="text-xs mb-2 opacity-70">Bracket preview</div>
            <iframe
              src={`${API_ORIGIN}/embed/challonge?url=${encodeURIComponent(normalizeChallongeInput(challongeUrl))}`}
              width="100%"
              height={360}
              frameBorder={0}
              scrolling="auto"
              allowTransparency
              style={{ borderRadius: 8, background: "transparent" }}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-semibold">Event Image</label>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onloadend = () => setImageUrl(reader.result as string)
              reader.readAsDataURL(file)
            }}
          />
          {imageUrl && <img src={imageUrl} alt="Event Preview" className="w-48 mx-auto rounded" />}
        </div>

        <input
          className="input input-bordered"
          type="number"
          placeholder="Capacity (for upcoming)"
          value={capacity ?? ""}
          onChange={e => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)}
        />
        <input
          className="input input-bordered"
          type="number"
          placeholder="Attendee Count (for completed)"
          value={attendeeCount ?? ""}
          onChange={e => setAttendeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
        />

        <select className="select select-bordered" value={country} onChange={e => { setCountry(e.target.value); setRegion("") }}>
          <option value="">Select Country</option>
          <option value="Canada">Canada</option>
          <option value="United States">United States</option>
        </select>
        <input className="input input-bordered" placeholder={country === "Canada" ? "Province" : "State"} value={region} onChange={e => setRegion(e.target.value)} />
        <input className="input input-bordered" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />

        <div className="space-y-2">
          <h3 className="font-semibold">Top Cut Combos</h3>

          {topCut.map((p, i) => (
            <div key={i} className="space-y-2 border rounded p-2">
              <div className="relative">
                <input
                  className="input input-sm w-full"
                  placeholder="Player Name"
                  value={p.name}
                  onChange={e => handlePlayerNameChange(i, e.target.value)}
                  autoComplete="off"
                />

                {nameSuggestions[i]?.length ? (
                  <ul className="absolute z-20 mt-1 w-full rounded-md border border-white/10 bg-base-100 shadow-lg max-h-60 overflow-auto">
                    {nameSuggestions[i].map((u) => (
                      <li
                        key={u.id}
                        className="px-3 py-2 hover:bg-base-200 cursor-pointer"
                        onClick={() => selectSuggestedUser(i, u)}
                      >
                        <div className="flex items-center gap-2">
                          {u.avatarDataUrl ? (
                            <img src={u.avatarDataUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : null}
                          <div className="min-w-0">
                            <div className="font-medium truncate">@{u.username}</div>
                            {u.displayName ? <div className="text-xs opacity-70 truncate">{u.displayName}</div> : null}
                          </div>
                        </div>
                      </li>
                    ))}
                    <li className="px-3 py-2 text-xs opacity-60">Or keep free text: “{p.name}”</li>
                  </ul>
                ) : null}
              </div>

              {p.combos.map((c, j) => (
                <div key={j} className="grid md:grid-cols-5 gap-2">
                  <input className="input input-sm" placeholder="Blade" value={c.blade} onChange={e => updateTopCutCombo(i, j, "blade", e.target.value)} />
                  <input className="input input-sm" placeholder="Assist Blade (optional)" value={c.assistBlade ?? ""} onChange={e => updateTopCutCombo(i, j, "assistBlade", e.target.value)} />
                  <input className="input input-sm" placeholder="Ratchet" value={c.ratchet} onChange={e => updateTopCutCombo(i, j, "ratchet", e.target.value)} />
                  <input className="input input-sm" placeholder="Bit" value={c.bit} onChange={e => updateTopCutCombo(i, j, "bit", e.target.value)} />
                  <input className="input input-sm" placeholder="Notes" value={c.notes ?? ""} onChange={e => updateTopCutCombo(i, j, "notes", e.target.value)} />
                </div>
              ))}

              <button className="btn btn-outline btn-xs" onClick={() => addCombo(i)}>Add Combo</button>
              <button className="btn btn-error btn-xs" onClick={() => removeTopCutPlayer(i)}>Remove Player</button>
            </div>
          ))}

          <button className="btn btn-outline btn-sm" onClick={addTopCutPlayer}>Add Player</button>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={submitEventForReview}>Submit for Review</button>
          <button className="btn btn-ghost" onClick={resetForm}>Clear</button>
        </div>
      </div>
    </motion.div>
  )
}
