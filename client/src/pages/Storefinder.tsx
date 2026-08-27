import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Globe2,
  Grid3X3,
  List,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"
const SPONSORED_STORE_ID = 1754921172194
const PAGE_SIZE = 12

type Store = {
  id: number | string
  name: string
  address?: string
  logo?: string
  country?: string
  region?: string
  city?: string
  website?: string
  notes?: string
  mapEmbedUrl?: string
}

type SortBy = "Name (A → Z)" | "Name (Z → A)"
type ViewMode = "grid" | "list"
type PageItem = number | "ellipsis-start" | "ellipsis-end"

const normalize = (value?: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const locationLabel = (store: Store) =>
  [store.city, store.region, store.country].filter(Boolean).join(", ")

const isOnlineOnly = (store: Store) => normalize(store.address).includes("online only")

const directionsUrl = (store: Store) => {
  if (!store.address || isOnlineOnly(store)) return null
  const destination = [store.address, store.city, store.region, store.country].filter(Boolean).join(", ")
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

const pageItems = (total: number, current: number): PageItem[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total]
  if (current >= total - 3) return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total]
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total]
}

export default function StoreFinder() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = searchParams.get("view") === "list" ? "list" : "grid"
  const initialSort = searchParams.get("sort") === "Name (Z → A)" ? "Name (Z → A)" : "Name (A → Z)"

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [country, setCountry] = useState(searchParams.get("country") || "All")
  const [region, setRegion] = useState(searchParams.get("region") || "All")
  const [city, setCity] = useState(searchParams.get("city") || "All")
  const [sortBy, setSortBy] = useState<SortBy>(initialSort)
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [view, setView] = useState<ViewMode>(initialView)
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1))
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !/input|textarea|select/i.test((event.target as HTMLElement)?.tagName)) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadStores() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API}/stores`, { signal: controller.signal })
        if (!response.ok) throw new Error("The store directory could not be loaded.")
        const data = await response.json()
        setStores(Array.isArray(data) ? data : [])
      } catch (requestError) {
        if ((requestError as Error)?.name !== "AbortError") {
          setError("The store directory could not be loaded. Please try again.")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadStores()
    return () => controller.abort()
  }, [loadAttempt])

  const sponsoredStore = useMemo(
    () => stores.find((store) => String(store.id) === String(SPONSORED_STORE_ID)),
    [stores]
  )

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(stores.map((store) => store.country).filter(Boolean) as string[])).sort()],
    [stores]
  )

  const regions = useMemo(() => {
    const available = country === "All" ? stores : stores.filter((store) => store.country === country)
    return ["All", ...Array.from(new Set(available.map((store) => store.region).filter(Boolean) as string[])).sort()]
  }, [country, stores])

  const cities = useMemo(() => {
    const available = stores.filter(
      (store) =>
        (country === "All" || store.country === country) &&
        (region === "All" || store.region === region)
    )
    return ["All", ...Array.from(new Set(available.map((store) => store.city).filter(Boolean) as string[])).sort()]
  }, [country, region, stores])

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query)
    const matches = stores.filter((store) => {
      const matchesLocation =
        (country === "All" || store.country === country) &&
        (region === "All" || store.region === region) &&
        (city === "All" || store.city === city)

      if (!matchesLocation) return false
      if (!normalizedQuery) return true

      return [store.name, store.address, store.city, store.region, store.country]
        .filter(Boolean)
        .some((value) => normalize(value).includes(normalizedQuery))
    })

    return matches.sort((first, second) =>
      sortBy === "Name (A → Z)"
        ? first.name.localeCompare(second.name)
        : second.name.localeCompare(first.name)
    )
  }, [city, country, query, region, sortBy, stores])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const currentStores = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const firstResult = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const lastResult = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const countryCount = useMemo(
    () => new Set(stores.map((store) => store.country).filter(Boolean)).size,
    [stores]
  )
  const activeFilterCount = [query, country !== "All", region !== "All", city !== "All"].filter(Boolean).length

  useEffect(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      const sync = (key: string, value: string | number, defaultValue?: string | number) => {
        if (!value || value === defaultValue) next.delete(key)
        else next.set(key, String(value))
      }

      sync("country", country, "All")
      sync("region", region, "All")
      sync("city", city, "All")
      sync("sort", sortBy, "Name (A → Z)")
      sync("q", query, "")
      sync("view", view, "grid")
      sync("page", currentPage, 1)
      next.delete("ps")
      return next
    }, { replace: true })
  }, [city, country, currentPage, query, region, setSearchParams, sortBy, view])

  const changeCountry = (value: string) => {
    setCountry(value)
    setRegion("All")
    setCity("All")
    setPage(1)
  }

  const changeRegion = (value: string) => {
    setRegion(value)
    setCity("All")
    setPage(1)
  }

  const clearFilters = () => {
    setQuery("")
    setCountry("All")
    setRegion("All")
    setCity("All")
    setPage(1)
    searchRef.current?.focus()
  }

  const changePage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)))
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a12] text-white">
      <Helmet>
        <title>Store Finder | MetaBeys</title>
        <meta
          name="description"
          content="Find Beyblade stores, local events, and competitive communities by country, region, and city."
        />
        <link rel="canonical" href="https://www.metabeys.com/stores" />
      </Helmet>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_15%_0%,rgba(99,102,241,0.17),transparent_38%),radial-gradient(circle_at_85%_8%,rgba(14,165,233,0.10),transparent_34%)]"
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-20 pt-9 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-400/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200">
            <MapPin className="h-3.5 w-3.5" /> Store directory
          </div>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Find your local Beyblade scene.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Search for Beyblade stores, discover local events, and find the communities closest to you.
          </p>
          {!loading && !error ? (
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
              {stores.length.toLocaleString()} stores listed <span className="mx-2 text-white/15">•</span> {countryCount.toLocaleString()} {countryCount === 1 ? "country" : "countries"}
            </p>
          ) : null}
        </motion.header>

        {sponsoredStore ? <FeaturedStore store={sponsoredStore} /> : null}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mt-8 overflow-visible rounded-[28px] border border-white/10 bg-[#0c1120]/95 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:mt-10"
        >
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-stretch gap-2 sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by store, city, or address"
                  aria-label="Search stores"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/15 focus:border-indigo-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/10 sm:text-base"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("")
                      setPage(1)
                      searchRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-white/35 sm:block">/</kbd>
                )}
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="relative inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.09] md:hidden"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-black text-white">{activeFilterCount}</span>
                ) : null}
              </button>
            </div>

            <div className={`${filtersOpen ? "grid" : "hidden"} mt-4 gap-3 md:grid md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]`}>
              <FilterSelect
                label="Country"
                value={country}
                options={countries}
                allLabel="All countries"
                onChange={changeCountry}
              />
              <FilterSelect
                label="State / province"
                value={region}
                options={regions}
                allLabel="All regions"
                disabled={country === "All"}
                disabledLabel="Choose a country first"
                onChange={changeRegion}
              />
              <FilterSelect
                label="City"
                value={city}
                options={cities}
                allLabel="All cities"
                disabled={country === "All"}
                disabledLabel="Choose a country first"
                onChange={(value) => {
                  setCity(value)
                  setPage(1)
                }}
              />
              <FilterSelect
                label="Sort"
                value={sortBy}
                options={["Name (A → Z)", "Name (Z → A)"]}
                onChange={(value) => {
                  setSortBy(value as SortBy)
                  setPage(1)
                }}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                  className="h-[46px] w-full rounded-xl border border-white/10 px-4 text-sm font-semibold text-white/55 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 lg:w-auto"
                >
                  Clear all
                </button>
              </div>
            </div>

            {(country !== "All" || region !== "All" || city !== "All") ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
                <span className="mr-1 text-xs font-medium text-white/35">Filtering by</span>
                {country !== "All" ? <FilterPill label={country} onRemove={() => changeCountry("All")} /> : null}
                {region !== "All" ? <FilterPill label={region} onRemove={() => changeRegion("All")} /> : null}
                {city !== "All" ? <FilterPill label={city} onRemove={() => { setCity("All"); setPage(1) }} /> : null}
              </div>
            ) : null}
          </div>
        </motion.section>

        <section ref={resultsRef} className="scroll-mt-6 pt-8 sm:pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Directory</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                {loading ? "Loading stores" : error ? "Store directory" : `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "store" : "stores"}`}
              </h2>
              {!loading && !error && filtered.length > 0 ? (
                <p className="mt-1 text-sm text-white/40">Showing {firstResult}–{lastResult} of {filtered.length.toLocaleString()}</p>
              ) : null}
            </div>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.035] p-1">
              <ViewButton active={view === "grid"} label="Grid view" onClick={() => setView("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </ViewButton>
              <ViewButton active={view === "list"} label="List view" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </ViewButton>
            </div>
          </div>

          {loading ? (
            <StoreSkeletons view={view} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setLoadAttempt((attempt) => attempt + 1)} />
          ) : filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <motion.div
              layout
              className={view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3"}
            >
              <AnimatePresence mode="popLayout">
                {currentStores.map((store) => (
                  <StoreCard key={store.id} store={store} view={view} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!loading && !error && filtered.length > PAGE_SIZE ? (
            <Pagination current={currentPage} total={totalPages} onChange={changePage} />
          ) : null}
        </section>
      </div>
    </main>
  )
}

function FeaturedStore({ store }: { store: Store }) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.03 }}
      className="relative mt-8 overflow-hidden rounded-[24px] border border-amber-300/15 bg-[#0d1220] shadow-2xl shadow-black/20 sm:mt-10"
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-400" />
      <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-300/[0.07] blur-3xl" />
      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-7">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] sm:h-20 sm:w-20">
          {store.logo ? (
            <img src={store.logo} alt={`${store.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-7 w-7 text-white/35" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Featured store
            </span>
            {locationLabel(store) ? <span className="text-xs text-white/30">{locationLabel(store)}</span> : null}
          </div>
          <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em] sm:text-2xl">{store.name}</h2>
          {store.notes ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50 line-clamp-2">{store.notes}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            to={`/stores/${store.id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
          >
            View profile <ArrowRight className="h-4 w-4" />
          </Link>
          {store.website ? (
            <a
              href={store.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-[#151006] transition hover:bg-amber-200"
            >
              Visit store <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.aside>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
  disabled = false,
  disabledLabel,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  allLabel?: string
  disabled?: boolean
  disabledLabel?: string
}) {
  return (
    <label className={disabled ? "opacity-45" : ""}>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-[46px] w-full appearance-none rounded-xl border border-white/10 bg-[#101625] px-3.5 pr-9 text-sm text-white outline-none transition hover:border-white/20 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed"
          aria-label={label}
        >
          {disabled && disabledLabel ? <option value="All">{disabledLabel}</option> : null}
          {!disabled
            ? options.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? allLabel || option : option}
                </option>
              ))
            : null}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
      </span>
    </label>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/15 bg-indigo-400/[0.08] py-1.5 pl-3 pr-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/[0.14]"
    >
      {label} <X className="h-3.5 w-3.5 text-indigo-200/60" />
    </button>
  )
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg transition ${active ? "bg-white/[0.11] text-white shadow-sm" : "text-white/35 hover:text-white/70"}`}
    >
      {children}
    </button>
  )
}

function StoreCard({ store, view }: { store: Store; view: ViewMode }) {
  const directions = directionsUrl(store)
  const location = locationLabel(store)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#0c1120] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/20 ${view === "grid" ? "flex h-full flex-col p-5" : "p-4 sm:p-5"}`}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className={view === "list" ? "flex flex-col gap-4 sm:flex-row sm:items-center" : "flex flex-1 flex-col"}>
        <div className={view === "list" ? "flex min-w-0 flex-1 items-start gap-4" : "flex items-start gap-4"}>
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] sm:h-16 sm:w-16">
            {store.logo ? (
              <img src={store.logo} alt={`${store.name} logo`} loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-white/30" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link to={`/stores/${store.id}`} className="inline-flex max-w-full items-start gap-2">
              <h3 className="truncate text-lg font-bold tracking-[-0.02em] text-white transition group-hover:text-indigo-200">{store.name}</h3>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-300" />
            </Link>
            {location ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-white/45">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300/70" />
                <span className="line-clamp-1">{location}</span>
              </p>
            ) : isOnlineOnly(store) ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/45"><Globe2 className="h-3.5 w-3.5 text-sky-300/70" /> Online store</p>
            ) : null}
          </div>
        </div>

        <div className={view === "list" ? "min-w-0 flex-1 sm:max-w-xl" : "mt-5 flex-1"}>
          {store.address ? (
            <p className="text-sm leading-6 text-white/60 line-clamp-2">{store.address}</p>
          ) : null}
          {store.notes ? (
            <p className={`${store.address ? "mt-2" : ""} text-sm leading-6 text-white/38 ${view === "list" ? "line-clamp-2" : "line-clamp-3"}`}>{store.notes}</p>
          ) : null}
        </div>

        <div className={`${view === "list" ? "sm:ml-auto sm:shrink-0" : "mt-5 border-t border-white/[0.07] pt-4"} flex flex-wrap items-center gap-2`}>
          <Link
            to={`/stores/${store.id}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3.5 text-xs font-bold text-white transition hover:bg-indigo-400 sm:flex-none"
          >
            Store profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/stores/${store.id}/upcoming`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            title={`Upcoming events at ${store.name}`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Events
          </Link>
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              aria-label={`Get directions to ${store.name}`}
              title="Get directions"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
            >
              <MapPin className="h-4 w-4" />
            </a>
          ) : null}
          {store.website ? (
            <a
              href={store.website}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visit ${store.name} website`}
              title="Visit website"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}

function StoreSkeletons({ view }: { view: ViewMode }) {
  return (
    <div className={view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3"}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={`animate-pulse rounded-[22px] border border-white/[0.07] bg-[#0c1120] p-5 ${view === "grid" ? "h-[280px]" : "h-[150px]"}`}>
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.06]" />
            <div className="flex-1 pt-1">
              <div className="h-4 w-2/3 rounded bg-white/[0.07]" />
              <div className="mt-3 h-3 w-1/2 rounded bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.025] px-6 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <Search className="h-5 w-5 text-white/35" />
      </div>
      <h3 className="mt-4 text-lg font-bold">No stores found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">Try a broader location or a different store name.</p>
      <button type="button" onClick={onClear} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#080b12] transition hover:bg-white/90">Clear filters</button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[24px] border border-rose-300/10 bg-rose-400/[0.035] px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <Building2 className="h-5 w-5 text-white/35" />
      </div>
      <h3 className="mt-4 text-lg font-bold">We couldn’t load the stores</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#080b12] transition hover:bg-white/90">Try again</button>
    </div>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  return (
    <nav aria-label="Store directory pages" className="mt-9 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="inline-flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
      </button>

      {pageItems(total, current).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === current ? "page" : undefined}
            className={`grid h-10 w-10 place-items-center rounded-xl border text-xs font-bold transition ${item === current ? "border-indigo-400/60 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07] hover:text-white"}`}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="grid h-10 w-7 place-items-center text-sm text-white/25">…</span>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="inline-flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
