// File: client/src/pages/Admin.tsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import toast from "react-hot-toast"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Event {
  id: number
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  imageUrl?: string
  topCut?: Player[]
  capacity?: number
  attendeeCount?: number
  country?: string
  region?: string
  city?: string
}

interface Player {
  name: string
  combos: Combo[]
}

interface Combo {
  blade: string
  ratchet: string
  bit: string
  notes?: string
}

interface Store {
  id: number
  name: string
  address: string
  logo: string
  mapEmbedUrl: string
  website: string
  notes: string
  country?: string
  region?: string
  city?: string
}

export default function Admin() {
  const [events, setEvents] = useState<Event[]>([])
  const [stores, setStores] = useState<Store[]>([])
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [topCut, setTopCut] = useState<Player[]>([])
  const [storeForm, setStoreForm] = useState<Omit<Store, "id">>({
    name: "", address: "", logo: "", mapEmbedUrl: "", website: "", notes: "", country: "", region: "", city: ""
  })
  const [storeEditId, setStoreEditId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API}/events`).then(res => res.json()).then((data: Event[]) => {
      const sorted = data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      setEvents(sorted)
    })
    fetch(`${API}/stores`).then(res => res.json()).then(setStores)
  }, [])

  const resetForm = () => {
    setEditingId(null)
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
  }

  const addOrUpdateEvent = () => {
    const payload = { title, startTime, endTime, store, topCut, buyLink, imageUrl, capacity, attendeeCount, country, region, city }
    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `${API}/events/${editingId}` : `${API}/events`
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(() => {
      toast.success(editingId ? "Event updated" : "Event added")
      resetForm()
      fetch(`${API}/events`).then(res => res.json()).then(setEvents)
    })
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
      {
        name: "",
        combos: [{ blade: "", ratchet: "", bit: "", notes: "" }]
      }
    ])
  }

  const removeTopCutPlayer = (i: number) => {
    setTopCut(prev => prev.filter((_, idx) => idx !== i))
  }

  const updatePlayerName = (i: number, val: string) => {
    setTopCut(prev => {
      const copy = [...prev]
      copy[i].name = val
      return copy
    })
  }

  const submitStore = () => {
    const method = storeEditId ? "PUT" : "POST"
    const url = storeEditId ? `${API}/stores/${storeEditId}` : `${API}/stores`

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storeForm)
    }).then(() => {
      toast.success(storeEditId ? "Store updated" : "Store added")
      setStoreForm({ name: "", address: "", logo: "", mapEmbedUrl: "", website: "", notes: "", country: "", region: "", city: "" })
      setStoreEditId(null)
      fetch(`${API}/stores`).then(res => res.json()).then(setStores)
    })
  }

  const editStore = (store: Store) => {
    setStoreEditId(store.id)
    const { id, ...rest } = store
    setStoreForm(rest)
  }

  const deleteStore = (id: number) => {
    fetch(`${API}/stores/${id}`, { method: "DELETE" }).then(() => {
      toast.success("Store deleted")
      fetch(`${API}/stores`).then(res => res.json()).then(setStores)
    })
  }

  const deleteEvent = (id: number) => {
    fetch(`${API}/events/${id}`, { method: "DELETE" }).then(() => {
      toast.success("Event deleted")
      fetch(`${API}/events`).then(res => res.json()).then(setEvents)
    })
  }

  const editEvent = (e: Event) => {
    setEditingId(e.id)
    setTitle(e.title)
    setStartTime(e.startTime)
    setEndTime(e.endTime)
    setStore(e.store)
    setBuyLink(e.buyLink || "")
    setImageUrl(e.imageUrl || "")
    setTopCut(e.topCut || [])
    setCapacity(e.capacity)
    setAttendeeCount(e.attendeeCount)
    setCountry(e.country || "")
    setRegion(e.region || "")
    setCity(e.city || "")
  }

  const upcomingEvents = events.filter(e => new Date(e.startTime) > new Date())
  const completedEvents = events.filter(e => new Date(e.startTime) <= new Date())

  return (
    <motion.div className="p-6 max-w-5xl mx-auto space-y-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      {/* Event Form */}
      <div className="card bg-base-200 p-4 space-y-4">
        <h2 className="text-xl font-bold">Create or Edit Event</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <input className="input input-bordered" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input input-bordered" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          <input className="input input-bordered" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
          <input className="input input-bordered" placeholder="Store" value={store} onChange={e => setStore(e.target.value)} />
        </div>
        <input className="input input-bordered" placeholder="Buy Ticket URL" value={buyLink} onChange={e => setBuyLink(e.target.value)} />
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
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }}
  />
  {imageUrl && (
    <img src={imageUrl} alt="Event Preview" className="w-48 mx-auto rounded" />
  )}
</div>

        <input className="input input-bordered" type="number" placeholder="Capacity (for upcoming)" value={capacity ?? ""} onChange={e => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)} />
        <input className="input input-bordered" type="number" placeholder="Attendee Count (for completed)" value={attendeeCount ?? ""} onChange={e => setAttendeeCount(e.target.value ? parseInt(e.target.value) : undefined)} />

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
              <input className="input input-sm w-full" placeholder="Player Name" value={p.name} onChange={e => updatePlayerName(i, e.target.value)} />
              {p.combos.map((c, j) => (
                <div key={j} className="grid md:grid-cols-4 gap-2">
                  <input className="input input-sm" placeholder="Blade" value={c.blade} onChange={e => updateTopCutCombo(i, j, "blade", e.target.value)} />
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
          <button className="btn btn-primary" onClick={addOrUpdateEvent}>{editingId ? "Update" : "Add"} Event</button>
          {editingId && <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      {/* Store Form */}
      <div className="card bg-base-200 p-4 space-y-4">
        <h2 className="text-xl font-bold">Add or Edit Store</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input className="input input-bordered" placeholder="Name" value={storeForm.name} onChange={e => setStoreForm(s => ({ ...s, name: e.target.value }))} />
          <input className="input input-bordered" placeholder="Address" value={storeForm.address} onChange={e => setStoreForm(s => ({ ...s, address: e.target.value }))} />
          <div className="space-y-2">
  <label className="text-sm font-semibold">Store Logo</label>
  <input
    type="file"
    accept="image/*"
    className="file-input file-input-bordered w-full"
    onChange={(e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onloadend = () => {
        setStoreForm(s => ({ ...s, logo: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }}
  />
  {storeForm.logo && (
    <img src={storeForm.logo} alt="Preview" className="w-32 h-32 object-contain border rounded" />
  )}
</div>

          <input className="input input-bordered" placeholder="Google Maps Embed URL" value={storeForm.mapEmbedUrl} onChange={e => setStoreForm(s => ({ ...s, mapEmbedUrl: e.target.value }))} />
          <input className="input input-bordered" placeholder="Website" value={storeForm.website} onChange={e => setStoreForm(s => ({ ...s, website: e.target.value }))} />
          <select className="select select-bordered" value={storeForm.country} onChange={e => setStoreForm(s => ({ ...s, country: e.target.value }))}>
            <option value="">Select Country</option>
            <option value="Canada">Canada</option>
            <option value="United States">United States</option>
          </select>
          <input className="input input-bordered" placeholder={storeForm.country === "Canada" ? "Province" : "State"} value={storeForm.region} onChange={e => setStoreForm(s => ({ ...s, region: e.target.value }))} />
          <input className="input input-bordered" placeholder="City" value={storeForm.city} onChange={e => setStoreForm(s => ({ ...s, city: e.target.value }))} />
        </div>
        <textarea className="textarea textarea-bordered w-full" placeholder="Notes" value={storeForm.notes} onChange={e => setStoreForm(s => ({ ...s, notes: e.target.value }))}></textarea>
        <button className="btn btn-success" onClick={submitStore}>{storeEditId ? "Update" : "Add"} Store</button>
      </div>

      {/* Event Listings */}
      <details className="bg-base-200 p-4 rounded-lg">
        <summary className="text-xl font-bold cursor-pointer">Upcoming Events</summary>
        <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
          {upcomingEvents.map(e => (
            <div key={e.id} className="card bg-base-100 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-neutral-content">
                  {new Date(e.startTime).toLocaleString()} → {new Date(e.endTime).toLocaleTimeString()} @ {e.store}
                </p>
                {e.buyLink && (
                  <a href={e.buyLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                    Buy Ticket Link
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Link to={`/events/${e.id}`} className="btn btn-outline btn-sm">View</Link>
                <button className="btn btn-info btn-sm" onClick={() => editEvent(e)}>Edit</button>
                <button className="btn btn-error btn-sm" onClick={() => deleteEvent(e.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="bg-base-200 p-4 rounded-lg">
        <summary className="text-xl font-bold cursor-pointer">Completed Events</summary>
        <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
          {completedEvents.map(e => (
            <div key={e.id} className="card bg-base-100 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-neutral-content">
                  {new Date(e.startTime).toLocaleString()} → {new Date(e.endTime).toLocaleTimeString()} @ {e.store}
                </p>
                {e.buyLink && (
                  <a href={e.buyLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                    Buy Ticket Link
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Link to={`/events/${e.id}`} className="btn btn-outline btn-sm">View</Link>
                <button className="btn btn-info btn-sm" onClick={() => editEvent(e)}>Edit</button>
                <button className="btn btn-error btn-sm" onClick={() => deleteEvent(e.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Stores List */}
      <details className="bg-base-200 p-4 rounded-lg">
        <summary className="text-xl font-bold cursor-pointer">All Stores</summary>
        <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
          {stores.map((store: Store) => (
            <div key={store.id} className="card bg-base-100 p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{store.name}</p>
                <p className="text-sm text-neutral-content">{store.address}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/stores/${store.id}`} className="btn btn-outline btn-sm">View</Link>
                <button className="btn btn-info btn-sm" onClick={() => editStore(store)}>Edit</button>
                <button className="btn btn-error btn-sm" onClick={() => deleteStore(store.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </details>
    </motion.div>
  )
}
