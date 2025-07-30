// File: src/pages/StoreAdmin.tsx
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { toast } from "react-hot-toast"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Combo {
  blade: string
  ratchet: string
  bit: string
  notes?: string
}

export default function StoreAdmin() {
  const { isAuthenticated, user } = useAuth()

  const [storeEvents, setStoreEvents] = useState<any[]>([])
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  const [eventTitle, setEventTitle] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [buyLink, setBuyLink] = useState("")
  const [capacity, setCapacity] = useState(32)
  const [imageUrl, setImageUrl] = useState("")
  const [storeName, setStoreName] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [country, setCountry] = useState("")

  const [playerName, setPlayerName] = useState("")
  const [combos, setCombos] = useState<Combo[]>([])
  const [blade, setBlade] = useState("")
  const [ratchet, setRatchet] = useState("")
  const [bit, setBit] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedEventId, setSelectedEventId] = useState("")

  if (!isAuthenticated || !user) return <Navigate to="/user-auth" />

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API}/events`)
      const data = await res.json()
      setStoreEvents(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load events")
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const resetForm = () => {
    setEditingEvent(null)
    setEventTitle("")
    setStartTime("")
    setEndTime("")
    setBuyLink("")
    setImageUrl("")
    setCapacity(32)
    setStoreName("")
    setCity("")
    setRegion("")
    setCountry("")
  }

  const handleSave = async () => {
    const payload = {
      title: eventTitle,
      startTime,
      endTime,
      buyLink,
      imageUrl,
      capacity,
      store: storeName,
      city,
      region,
      country,
    }

    try {
      const response = await fetch(
        `${API}/events${editingEvent ? `/${editingEvent.id}` : ""}`,
        {
          method: editingEvent ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) throw new Error("Error saving event")

      toast.success(editingEvent ? "Event updated" : "Event created")
      resetForm()
      fetchEvents()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save event")
    }
  }

  const addCombo = () => {
    if (combos.length >= 3) {
      toast.error("Max 3 combos allowed")
      return
    }
    if (!blade || !ratchet || !bit) {
      toast.error("Fill all combo fields")
      return
    }
    setCombos([...combos, { blade, ratchet, bit, notes }])
    setBlade("")
    setRatchet("")
    setBit("")
    setNotes("")
  }

  const submitTopCut = async () => {
    if (!selectedEventId || !playerName || combos.length === 0) {
      toast.error("Fill all fields and add combos")
      return
    }

    try {
      const res = await fetch(`${API}/events/${selectedEventId}/topcut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName,
          combos,
        }),
      })

      if (!res.ok) throw new Error("Failed to submit top cut")

      toast.success("Top Cut submitted")
      setPlayerName("")
      setCombos([])
      setSelectedEventId("")
    } catch (err) {
      console.error(err)
      toast.error("Error submitting top cut")
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-4">🛠️ Store Admin Panel</h1>
      <p className="text-lg">
        Welcome, {user.username}! You can create events and submit top cut combos.
      </p>

      {/* EVENT CREATION */}
      <div className="mt-6 border-t border-gray-700 pt-6">
        <h2 className="text-xl font-bold mb-2">
          {editingEvent ? "Edit Event" : "Create New Event"}
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <input type="text" placeholder="Event Title" className="input input-bordered" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input input-bordered" />
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input input-bordered" />
          <input type="text" placeholder="Buy Link (optional)" className="input input-bordered" value={buyLink} onChange={(e) => setBuyLink(e.target.value)} />
          <input type="text" placeholder="Image URL (optional)" className="input input-bordered" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input type="number" placeholder="Player Cap" className="input input-bordered" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          <input type="text" placeholder="Store Name" className="input input-bordered" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <input type="text" placeholder="City" className="input input-bordered" value={city} onChange={(e) => setCity(e.target.value)} />
          <input type="text" placeholder="Region / State" className="input input-bordered" value={region} onChange={(e) => setRegion(e.target.value)} />
          <input type="text" placeholder="Country" className="input input-bordered" value={country} onChange={(e) => setCountry(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave}>
              {editingEvent ? "Update Event" : "Create Event"}
            </button>
            {editingEvent && <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </div>

        {/* EVENT LIST */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Your Events</h3>
          {storeEvents.length === 0 ? (
            <p>No events yet.</p>
          ) : (
            storeEvents.map((e) => (
              <div key={e.id} className="border border-gray-600 p-3 rounded mb-2 bg-gray-800">
                <p className="font-bold">{e.title}</p>
                <p>{new Date(e.startTime).toLocaleString()} → {new Date(e.endTime).toLocaleString()}</p>
                <p className="text-sm text-gray-400">{e.store}</p>
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-xs btn-accent" onClick={() => {
                    setEditingEvent(e)
                    setEventTitle(e.title)
                    setStartTime(e.startTime.slice(0, 16))
                    setEndTime(e.endTime.slice(0, 16))
                    setBuyLink(e.buyLink || "")
                    setImageUrl(e.imageUrl || "")
                    setCapacity(e.capacity || 32)
                    setStoreName(e.store || "")
                    setCity(e.city || "")
                    setRegion(e.region || "")
                    setCountry(e.country || "")
                  }}>
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TOP CUT COMBO SUBMISSION */}
      <div className="mt-12 border-t border-gray-700 pt-6">
        <h2 className="text-xl font-bold mb-2">Submit Top Cut Combos</h2>
        <select className="select select-bordered w-full mb-2" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
          <option value="">Select Event</option>
          {storeEvents.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <input type="text" placeholder="Player Name" className="input input-bordered mb-2" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <input type="text" placeholder="Blade" className="input input-bordered" value={blade} onChange={(e) => setBlade(e.target.value)} />
          <input type="text" placeholder="Ratchet" className="input input-bordered" value={ratchet} onChange={(e) => setRatchet(e.target.value)} />
          <input type="text" placeholder="Bit" className="input input-bordered" value={bit} onChange={(e) => setBit(e.target.value)} />
          <input type="text" placeholder="Notes (optional)" className="input input-bordered" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn btn-accent mb-4" onClick={addCombo}>Add Combo</button>

        <ul className="mb-4">
          {combos.map((c, i) => (
            <li key={i} className="text-sm text-gray-300 mb-1">#{i + 1}: {c.blade} / {c.ratchet} / {c.bit} {c.notes && `- ${c.notes}`}</li>
          ))}
        </ul>

        <button className="btn btn-primary" onClick={submitTopCut}>Submit Top Cut</button>
      </div>
    </div>
  )
}
