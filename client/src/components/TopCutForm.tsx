// File: src/components/TopCutForm.tsx
import { useState } from "react"
import { toast } from "react-hot-toast"

interface Combo {
  blade: string
  assistBlade?: string
  ratchet: string
  bit: string
  notes?: string
}

interface Props {
  eventOptions: { id: string; title: string }[]
  onSubmitted: () => void
}

export default function TopCutForm({ eventOptions, onSubmitted }: Props) {
  const [selectedEventId, setSelectedEventId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [combos, setCombos] = useState<Combo[]>([])

  const [blade, setBlade] = useState("")
  const [assistBlade, setAssistBlade] = useState("")
  const [ratchet, setRatchet] = useState("")
  const [bit, setBit] = useState("")
  const [notes, setNotes] = useState("")

  const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

  const addCombo = () => {
    if (combos.length >= 3) return toast.error("Max 3 combos allowed")
    if (!blade || !ratchet || !bit) return toast.error("Fill all combo fields")

    const newCombo: Combo = { blade, ratchet, bit, notes }
    if (assistBlade.trim()) newCombo.assistBlade = assistBlade
    setCombos([...combos, newCombo])

    setBlade("")
    setAssistBlade("")
    setRatchet("")
    setBit("")
    setNotes("")
  }

  const submitTopCut = async () => {
    if (!selectedEventId || !playerName || combos.length === 0)
      return toast.error("Fill all fields and add combos")

    try {
      const res = await fetch(`${API}/events/${selectedEventId}/topcut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, combos }),
      })
      if (!res.ok) throw new Error("Failed to submit top cut")

      toast.success("Top Cut submitted")
      setPlayerName("")
      setCombos([])
      setSelectedEventId("")
      onSubmitted()
    } catch (err) {
      console.error(err)
      toast.error("Error submitting top cut")
    }
  }

  return (
    <div className="mt-12 border-t border-gray-700 pt-6">
      <h2 className="text-xl font-bold mb-2">Submit Top Cut Combos</h2>
      <select className="select select-bordered w-full mb-2" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
        <option value="">Select Event</option>
        {eventOptions.map((e) => (
          <option key={e.id} value={e.id}>{e.title}</option>
        ))}
      </select>
      <input type="text" className="input input-bordered mb-2" placeholder="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
      <div className="grid md:grid-cols-2 gap-2 mb-2">
        <input type="text" className="input input-bordered" placeholder="Blade" value={blade} onChange={(e) => setBlade(e.target.value)} />
        <input type="text" className="input input-bordered" placeholder="Assist Blade (optional)" value={assistBlade} onChange={(e) => setAssistBlade(e.target.value)} />
        <input type="text" className="input input-bordered" placeholder="Ratchet" value={ratchet} onChange={(e) => setRatchet(e.target.value)} />
        <input type="text" className="input input-bordered" placeholder="Bit" value={bit} onChange={(e) => setBit(e.target.value)} />
        <input type="text" className="input input-bordered" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="btn btn-accent mb-4" onClick={addCombo}>Add Combo</button>
      <ul className="mb-4">
        {combos.map((c, i) => (
          <li key={i} className="text-sm text-gray-300 mb-1">
            #{i + 1}: {c.blade} {c.assistBlade ? `/ ${c.assistBlade}` : ""} / {c.ratchet} / {c.bit} {c.notes && `- ${c.notes}`}
          </li>
        ))}
      </ul>
      <button className="btn btn-primary" onClick={submitTopCut}>Submit Top Cut</button>
    </div>
  )
}
