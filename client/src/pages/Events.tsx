import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import Select from "react-select"

interface Event {
  id: number
  title: string
  startTime: string
  endTime: string
  store: string
  buyLink?: string
  capacity?: number
  city?: string
  region?: string
  country?: string
}

export default function Events() {
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
  const eventsPerPage = 10

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/events`)
      .then(res => res.json())
      .then((data: Event[]) => {
        const now = new Date()
        const upcoming = data.filter(e => new Date(e.endTime) > now)

        setEvents(upcoming)

        const uniqueStores = Array.from(new Set(upcoming.map(e => e.store.trim()))).sort()
        setStores(["All", ...uniqueStores])

        const uniqueCountries = Array.from(
          new Set(upcoming.map(e => e.country?.trim()).filter((v): v is string => !!v))
        ).sort()
        setCountries(["All", ...uniqueCountries])
      })
  }, [])

  useEffect(() => {
    if (selectedCountry === "All") {
      setRegions(["All"])
      setCities(["All"])
      setSelectedRegion("All")
      setSelectedCity("All")
      return
    }

    const countryMatched = events.filter(
      e => e.country?.trim().toLowerCase() === selectedCountry.toLowerCase()
    )

    const uniqueRegions = Array.from(
      new Set(countryMatched.map(e => e.region?.trim()).filter((v): v is string => !!v))
    ).sort()

    setRegions(["All", ...uniqueRegions])
    setSelectedRegion("All")
    setSelectedCity("All")
  }, [selectedCountry, events])

  useEffect(() => {
    if (selectedRegion === "All") {
      const countryMatched = events.filter(
        e => e.country?.trim().toLowerCase() === selectedCountry.toLowerCase()
      )

      const uniqueCities = Array.from(
        new Set(countryMatched.map(e => e.city?.trim()).filter((v): v is string => !!v))
      ).sort()

      setCities(["All", ...uniqueCities])
      return
    }

    const regionMatched = events.filter(
      e =>
        e.country?.trim().toLowerCase() === selectedCountry.toLowerCase() &&
        e.region?.trim().toLowerCase() === selectedRegion.toLowerCase()
    )

    const uniqueCities = Array.from(
      new Set(regionMatched.map(e => e.city?.trim()).filter((v): v is string => !!v))
    ).sort()

    setCities(["All", ...uniqueCities])
    setSelectedCity("All")
  }, [selectedRegion, selectedCountry, events])

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
    if (timeframe === "Next 30 Days") {
      const in30 = new Date()
      in30.setDate(now.getDate() + 30)
      result = result.filter(e => new Date(e.startTime) <= in30)
    }

    if (timeframe === "This Year") {
      const endOfYear = new Date(now.getFullYear(), 11, 31)
      result = result.filter(e => new Date(e.startTime) <= endOfYear)
    }

    result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    setFiltered(result)
    setCurrentPage(1)
  }, [events, selectedStore, selectedCountry, selectedRegion, selectedCity, timeframe])

  const toOptions = (arr: string[]) => arr.map(i => ({ label: i, value: i }))

  const selectTheme = (theme: any) => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: "#1f2937",
      neutral80: "#f9fafb",
      primary25: "#374151",
      primary: "#4f46e5"
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
      overflowY: "scroll",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "auto",
      msOverflowStyle: "auto",
      zIndex: 20
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#374151" : "#1f2937",
      color: "#f9fafb",
      cursor: "pointer"
    })
  }

  const indexOfLast = currentPage * eventsPerPage
  const indexOfFirst = indexOfLast - eventsPerPage
  const currentEvents = filtered.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filtered.length / eventsPerPage)

  return (
    <motion.div className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h1 className="text-3xl font-bold mb-4">
  Upcoming Events{" "}
  <span className="text-sm font-normal text-gray-400">({filtered.length} total)</span>
</h1>


      <div className="flex flex-wrap gap-4 mb-4 items-start">
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
          <p className={`font-semibold mb-1 ${selectedCountry === "All" ? "text-gray-400" : ""}`}>Province/State: {selectedCountry === "All" && <span className="text-xs italic ml-1">(select country first)</span>}</p>
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
          <p className={`font-semibold mb-1 ${selectedCountry === "All" ? "text-gray-400" : ""}`}>City: {selectedCountry === "All" && <span className="text-xs italic ml-1">(select country first)</span>}</p>
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
            options={toOptions(["All", "This Year", "Next 30 Days"])}
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

              {event.capacity !== undefined && (
                <p className="text-sm text-neutral-content">Capacity: {event.capacity}</p>
              )}

              <div className="card-actions justify-end flex-wrap gap-2">
                {event.buyLink && (
                  <a
                    href={event.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    Buy Ticket 🎟️
                  </a>
                )}
                <Link to={`/events/${event.id}`} className="btn btn-primary btn-sm">
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`btn btn-sm ${currentPage === i + 1 ? "btn-primary" : "btn-outline"}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
