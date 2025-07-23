import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import Select from "react-select"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Player {
  name: string
  combos: { blade: string; ratchet: string; bit: string }[]
}

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
  city?: string
  region?: string
  country?: string
}

export default function CompletedEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [filtered, setFiltered] = useState<Event[]>([])
  const [stores, setStores] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState("All")
  const [timeframe, setTimeframe] = useState("All")

  const [countries, setCountries] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  const [selectedCountry, setSelectedCountry] = useState("All")
  const [selectedRegion, setSelectedRegion] = useState("All")
  const [selectedCity, setSelectedCity] = useState("All")

  const [currentPage, setCurrentPage] = useState(1)
  const eventsPerPage = 9

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: Event[]) => {
        const past = data.filter(e => new Date(e.endTime) < new Date())
        setEvents(past)

        const storeList = Array.from(new Set(past.map(e => e.store.trim()))).sort()
        setStores(["All", ...storeList])

        const uniqueCountries = Array.from(
          new Set(past.map(e => e.country?.trim()).filter((v): v is string => Boolean(v)))
        ).sort()
        setCountries(["All", ...uniqueCountries])
      })
  }, [])

  useEffect(() => {
    const filteredEvents = selectedCountry === "All"
      ? []
      : events.filter(e => e.country?.trim().toLowerCase() === selectedCountry.toLowerCase())

    const uniqueRegions = Array.from(
      new Set(filteredEvents.map(e => e.region?.trim()).filter((v): v is string => Boolean(v)))
    ).sort()
    const uniqueCities = Array.from(
      new Set(filteredEvents.map(e => e.city?.trim()).filter((v): v is string => Boolean(v)))
    ).sort()

    setRegions(["All", ...uniqueRegions])
    setCities(["All", ...uniqueCities])
    setSelectedRegion("All")
    setSelectedCity("All")
  }, [selectedCountry, events])

  useEffect(() => {
    let result = [...events]

    if (selectedStore !== "All") {
      result = result.filter(e => e.store.trim().toLowerCase() === selectedStore.toLowerCase())
    }
    if (selectedCountry !== "All") {
      result = result.filter(e => e.country?.trim().toLowerCase() === selectedCountry.toLowerCase())
    }
    if (selectedRegion !== "All") {
      result = result.filter(e => e.region?.trim().toLowerCase() === selectedRegion.toLowerCase())
    }
    if (selectedCity !== "All") {
      result = result.filter(e => e.city?.trim().toLowerCase() === selectedCity.toLowerCase())
    }

    const now = new Date()
    if (timeframe === "Last 30 Days") {
      const cutoff = new Date()
      cutoff.setDate(now.getDate() - 30)
      result = result.filter(e => new Date(e.endTime) >= cutoff)
    }
    if (timeframe === "This Year") {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      result = result.filter(e => new Date(e.endTime) >= yearStart)
    }

    result.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    setFiltered(result)
    setCurrentPage(1)
  }, [events, selectedStore, selectedCountry, selectedRegion, selectedCity, timeframe])

  const indexOfLast = currentPage * eventsPerPage
  const indexOfFirst = indexOfLast - eventsPerPage
  const currentEvents = filtered.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filtered.length / eventsPerPage)

  const toOptions = (arr: string[]) => arr.map(item => ({ label: item, value: item }))

  const selectTheme = (theme: any) => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: "#1f2937",
      neutral80: "#f9fafb",
      primary25: "#374151",
      primary: "#4f46e5",
    }
  })

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      color: "#f9fafb"
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#f9fafb"
    }),
    menu: (base: any) => ({
  ...base,
  backgroundColor: "#1f2937",
  maxHeight: 150,
  overflowY: "auto",
  scrollbarWidth: "thin", // optional: better appearance in Firefox
  msOverflowStyle: "auto", // Edge support
}),
menuList: (base: any) => ({
  ...base,
  maxHeight: 150,
  overflowY: "auto",
}),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#374151" : "#1f2937",
      color: "#f9fafb",
      cursor: "pointer"
    })
  }

  return (
    <motion.div className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h1 className="text-3xl font-bold mb-4">
  Completed Events <span className="text-sm font-normal text-gray-400">({filtered.length} total)</span>
</h1>


      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-64">
          <p className="font-semibold mb-1">Filter by Store:</p>
          <Select
            options={toOptions(stores)}
            value={{ label: selectedStore, value: selectedStore }}
            onChange={opt => setSelectedStore(opt?.value || "All")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div className="w-64">
          <p className="font-semibold mb-1">Country:</p>
          <Select
            options={toOptions(countries)}
            value={{ label: selectedCountry, value: selectedCountry }}
            onChange={opt => setSelectedCountry(opt?.value || "All")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div className="w-64">
          <p className={`font-semibold mb-1 ${selectedCountry === "All" ? "text-gray-400" : ""}`}>
            Province/State:
            {selectedCountry === "All" && <span className="text-xs ml-1 italic">(select country first)</span>}
          </p>
          <Select
            options={toOptions(regions)}
            value={{ label: selectedRegion, value: selectedRegion }}
            onChange={opt => setSelectedRegion(opt?.value || "All")}
            isDisabled={selectedCountry === "All"}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div className="w-64">
          <p className={`font-semibold mb-1 ${selectedCountry === "All" ? "text-gray-400" : ""}`}>
            City:
            {selectedCountry === "All" && <span className="text-xs ml-1 italic">(select country first)</span>}
          </p>
          <Select
            options={toOptions(cities)}
            value={{ label: selectedCity, value: selectedCity }}
            onChange={opt => setSelectedCity(opt?.value || "All")}
            isDisabled={selectedCountry === "All"}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>

        <div className="w-64">
          <p className="font-semibold mb-1">Timeframe:</p>
          <Select
            options={toOptions(["All", "This Year", "Last 30 Days"])}
            value={{ label: timeframe, value: timeframe }}
            onChange={opt => setTimeframe(opt?.value || "All")}
            theme={selectTheme}
            styles={selectStyles}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {currentEvents.map(event => (
          <div key={event.id} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title">{event.title}</h2>
              <p className="text-sm">{new Date(event.startTime).toLocaleDateString()}</p>
              <p className="text-sm">@ {event.store}</p>

              {(event.city || event.region || event.country) && (
                <p className="text-sm text-neutral-content">
                  📍 {[event.city, event.region, event.country].filter(Boolean).join(", ")}
                </p>
              )}

              {event.attendeeCount !== undefined && (
                <p className="text-sm text-neutral-content">
                  {event.attendeeCount} players attended
                </p>
              )}

              <div className="card-actions justify-end">
                <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">View</Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            className="btn btn-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            ◀ Prev
          </button>
          <span className="btn btn-sm btn-disabled">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </motion.div>
  )
}
