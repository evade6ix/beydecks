import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import Select from "react-select"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"
const PER_PAGE = 20

interface Store {
  id: number
  name: string
  address: string
  logo?: string
  country?: string
  region?: string
  city?: string
}

export default function StoreFinder() {
  const [stores, setStores] = useState<Store[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)

  const [countries, setCountries] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  const [selectedCountry, setSelectedCountry] = useState("All")
  const [selectedRegion, setSelectedRegion] = useState("All")
  const [selectedCity, setSelectedCity] = useState("All")

  useEffect(() => {
    fetch(`${API}/stores`)
      .then(res => res.json())
      .then(data => {
        setStores(data)

        const countrySet = new Set<string>()
data.forEach((s: Store) => {
  if (s.country) countrySet.add(s.country)
})
const uniqueCountries = Array.from(countrySet).sort()
        setCountries(["All", ...uniqueCountries])
      })
  }, [])

  useEffect(() => {
    const filteredByCountry = selectedCountry === "All" ? stores : stores.filter(s => s.country === selectedCountry)
    const uniqueRegions = Array.from(new Set(filteredByCountry.map(s => s.region).filter((v): v is string => Boolean(v)))).sort()
    const uniqueCities = Array.from(new Set(filteredByCountry.map(s => s.city).filter((v): v is string => Boolean(v)))).sort()

    setRegions(["All", ...uniqueRegions])
    setCities(["All", ...uniqueCities])
    setSelectedRegion("All")
    setSelectedCity("All")
  }, [selectedCountry, stores])

  const filteredStores = stores.filter(store => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.country?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCountry = selectedCountry === "All" || store.country === selectedCountry
    const matchesRegion = selectedRegion === "All" || store.region === selectedRegion
    const matchesCity = selectedCity === "All" || store.city === selectedCity

    return matchesSearch && matchesCountry && matchesRegion && matchesCity
  })

  const totalPages = Math.ceil(filteredStores.length / PER_PAGE)
  const paginatedStores = filteredStores.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  )

  const toOptions = (arr: string[]) => arr.map(v => ({ label: v, value: v }))

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
    control: (base: any) => ({ ...base, backgroundColor: "#1f2937", borderColor: "#374151", color: "#f9fafb" }),
    singleValue: (base: any) => ({ ...base, color: "#f9fafb" }),
    menu: (base: any) => ({ ...base, backgroundColor: "#1f2937", maxHeight: 150, overflowY: "auto" }),
    menuList: (base: any) => ({ ...base, maxHeight: 150, overflowY: "auto" }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#374151" : "#1f2937",
      color: "#f9fafb",
      cursor: "pointer"
    })
  }

  return (
    <motion.div className="p-6 max-w-5xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h1 className="text-3xl font-bold mb-6">Store Finder</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by store, city, region, or country..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
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

        
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {paginatedStores.map(store => (
          <div key={store.id} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title">{store.name}</h2>
              <p className="text-sm">📍 {store.address}, {store.city}, {store.region}, {store.country}</p>
              {store.logo && (
                <img
                  src={store.logo}
                  alt={`${store.name} logo`}
                  className="w-full h-48 object-contain rounded-xl border bg-white p-2"
                />
              )}
              <div className="flex justify-between items-center mt-4">
                <Link to={`/stores/${store.id}/upcoming`} className="btn btn-sm btn-primary">
                  Events
                </Link>
                <Link to={`/stores/${store.id}`} className="btn btn-sm btn-primary">
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-4 items-center">
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  )
}
