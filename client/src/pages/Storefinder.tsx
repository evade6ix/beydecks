import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Select from "react-select"
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Lock,
  Grid as GridIcon,
  List as ListIcon,
  Download,
  ExternalLink,
  Building2,
  Globe2,
  Sparkles,
  ArrowUpRight,
  Youtube,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

// Hard-coded sponsored store (Mongo `id` value)
const SPONSORED_STORE_ID = 1754921172194

/* --------------------------------
   Types
---------------------------------*/
type Store = {
  id: number | string
  name: string
  address: string
  logo?: string
  country?: string
  region?: string
  city?: string
  website?: string
  notes?: string
  mapEmbedUrl?: string
}

type RSOption = { label: string; value: string }
type SortBy = "Name (A → Z)" | "Name (Z → A)"
type ViewMode = "grid" | "list"

/* --------------------------------
   Utils
---------------------------------*/
const toOptions = <T extends string>(arr: readonly T[]): RSOption[] =>
  arr.map((x) => ({ label: x, value: x }))

const normalize = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const fmtCount = (n: number) => n.toLocaleString()

/* --------------------------------
   react-select theme/styles (dark)
---------------------------------*/
const selectTheme = (theme: any) => ({
  ...theme,
  colors: {
    ...theme.colors,
    neutral0: "#111827",
    neutral80: "#e5e7eb",
    primary25: "#1f2937",
    primary50: "#374151",
    primary: "#6366f1",
  },
})
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "#111827",
    borderColor: state.isFocused ? "#374151" : "#1f2937",
    minHeight: 38,
    boxShadow: "none",
  }),
  singleValue: (base: any) => ({ ...base, color: "#e5e7eb" }),
  input: (base: any) => ({ ...base, color: "#e5e7eb" }),
  menu: (base: any) => ({ ...base, backgroundColor: "#111827", zIndex: 30 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1f2937" : "#111827",
    color: "#e5e7eb",
    cursor: "pointer",
  }),
}

/* --------------------------------
   Page
---------------------------------*/
export default function StoreFinder() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])

  const [country, setCountry] = useState<string>(searchParams.get("country") || "All")
  const [region, setRegion] = useState<string>(searchParams.get("region") || "All")
  const [city, setCity] = useState<string>(searchParams.get("city") || "All")
  const [sortBy, setSortBy] = useState<SortBy>((searchParams.get("sort") as SortBy) || "Name (A → Z)")
  const [query, setQuery] = useState<string>(searchParams.get("q") || "")
  const [view, setView] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "grid")
  const [page, setPage] = useState<number>(Number(searchParams.get("page")) || 1)
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get("ps")) || 12)

  const searchRef = useRef<HTMLInputElement>(null)

  // "/" focuses search like your events pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/input|textarea|select/i.test((e.target as any)?.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/stores`)
        const data: Store[] = await res.json()
        setStores(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Sponsored store derived from loaded stores
  const sponsoredStore = useMemo(
    () => stores.find((s) => String(s.id) === String(SPONSORED_STORE_ID)),
    [stores]
  )

  // options (cascading)
  const countries = useMemo(
    () => ["All", ...Array.from(new Set(stores.map((s) => s.country).filter(Boolean) as string[])).sort()],
    [stores]
  )
  const regions = useMemo(() => {
    const base = country === "All" ? stores : stores.filter((s) => s.country === country)
    return ["All", ...Array.from(new Set(base.map((s) => s.region).filter(Boolean) as string[])).sort()]
  }, [stores, country])
  const cities = useMemo(() => {
    const base = stores.filter(
      (s) => (country === "All" || s.country === country) && (region === "All" || s.region === region)
    )
    return ["All", ...Array.from(new Set(base.map((s) => s.city).filter(Boolean) as string[])).sort()]
  }, [stores, country, region])

  // filtered + searched + sorted
  const filtered = useMemo(() => {
    const q = normalize(query)
    let list = stores.filter(
      (s) =>
        (country === "All" || s.country === country) &&
        (region === "All" || s.region === region) &&
        (city === "All" || s.city === city)
    )

    if (q) {
      list = list.filter((s) =>
        [s.name, s.address, s.city, s.region, s.country]
          .filter(Boolean)
          .some((v) => normalize(v as string).includes(q))
      )
    }

    if (sortBy === "Name (A → Z)") list.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === "Name (Z → A)") list.sort((a, b) => b.name.localeCompare(a.name))

    return list
  }, [stores, country, region, city, sortBy, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const current = filtered.slice((pageSafe - 1) * pageSize, (pageSafe - 1) * pageSize + pageSize)

  // keep URL in sync
  useEffect(() => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      const setParam = (k: string, v: string | number) => {
        const str = String(v)
        if (!str || str === "All" || str === "1" || (k === "ps" && Number(str) === 12) || (k === "view" && str === "grid"))
          p.delete(k)
        else p.set(k, str)
      }
      setParam("country", country)
      setParam("region", region)
      setParam("city", city)
      setParam("sort", sortBy)
      setParam("q", query)
      setParam("view", view)
      setParam("page", pageSafe)
      setParam("ps", pageSize)
      return p
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, region, city, sortBy, query, view, pageSafe, pageSize])

  // dependent resets
  useEffect(() => {
    setRegion("All")
    setCity("All")
    setPage(1)
  }, [country])
  useEffect(() => {
    setCity("All")
    setPage(1)
  }, [region])

  // CSV export
  const exportCSV = () => {
    const headers = ["id", "name", "address", "city", "region", "country", "logo"]
    const rows = filtered.map((s) =>
      [s.id, s.name, s.address, s.city || "", s.region || "", s.country || "", s.logo || ""]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",")
    )
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "stores.csv"
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  /* -------------------- UI -------------------- */
  return (
    <motion.div className="mx-auto max-w-7xl p-4 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Title + quick stats */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">
            Store{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400">
              Finder
            </span>
          </h1>
          <p className="text-sm text-white/60 mt-1">Search, filter, sort — and get there fast.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <Stat label="Stores" value={fmtCount(stores.length)} />
          <Stat label="Matching" value={fmtCount(filtered.length)} />
          <Stat label="Per page" value={String(pageSize)} />
        </div>
      </div>

      {/* 🔥 Sponsored Store Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-7 relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-[1px] shadow-[0_24px_80px_rgba(15,23,42,0.95)]"
      >
        {/* Outer glow / frame */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-20 top-[-40px] h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-[-40px] bottom-[-40px] h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_65%)]" />
        </div>

        <div className="relative rounded-[26px] bg-[#020617]/90 px-5 py-5 md:px-8 md:py-6 lg:px-10 lg:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            {/* Left: logo + badge */}
            <div className="flex items-start gap-4 md:w-72 lg:w-80">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/80 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.65)]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                  Sponsored Store
                </span>
                <div className="mt-3 relative h-14 w-14 md:h-16 md:w-16 overflow-hidden rounded-2xl border border-white/15 bg-black/60 grid place-items-center">
                  {sponsoredStore?.logo ? (
                    <img
                      src={sponsoredStore.logo}
                      alt={sponsoredStore.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-7 w-7 text-white/50" />
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/15" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-fuchsia-500/10 mix-blend-screen" />
                </div>
              </div>
            </div>

            {/* Middle: content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl md:text-2xl font-semibold leading-tight">
                  {sponsoredStore?.name || "Featured Beyblade Store"}
                </h2>
                {sponsoredStore?.country && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80">
                    <Globe2 className="h-3.5 w-3.5" />
                    {sponsoredStore.country}
                    {sponsoredStore.region ? ` • ${sponsoredStore.region}` : ""}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-white/80 max-w-xl">
                {sponsoredStore?.notes ||
                  "Showcase your Beyblade store in front of players actively searching for locals, events, and product drops. This premium slot is built for brands that want to stand out."}
              </p>

              {/* Small meta row */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
                {sponsoredStore?.city && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                    <MapPin className="h-3 w-3" />
                    {sponsoredStore.city}
                    {sponsoredStore.region ? `, ${sponsoredStore.region}` : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                  <Sparkles className="h-3 w-3" />
                  Powered by MetaBeys Store Finder
                </span>
              </div>
            </div>

            {/* Right: CTAs */}
            <div className="flex flex-col gap-3 md:w-64 lg:w-72">
              <div className="flex flex-col gap-2">
                {sponsoredStore ? (
                  <>
                    {sponsoredStore.website && (
                      <a
                        href={sponsoredStore.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 px-3 py-2.5 text-xs md:text-sm font-medium text-white shadow-lg shadow-indigo-500/40 hover:brightness-110"
                      >
                        Visit Website
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <Link
                      to={`/stores/${sponsoredStore.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] md:text-xs text-white/80 hover:bg-white/10"
                    >
                      Store profile
                    </Link>

                    <a
                      href="https://www.youtube.com/zankye"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/60 bg-red-600/20 px-3 py-2 text-[11px] md:text-xs font-medium text-red-100 hover:bg-red-600/30"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      Watch Zankye on YouTube
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 px-3 py-2.5 text-xs md:text-sm font-medium text-white shadow-lg shadow-indigo-500/40 hover:brightness-110"
                    >
                      Your Store Here
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] text-white/55">
                      Highlight your Beyblade store to players searching for locals and events.
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Subtle animated underline */}
          <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60" />
        </div>
      </motion.div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search store, city, state/province, country, address…  (press /)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-9 outline-none focus:border-indigo-500/50"
          />
          <SearchIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        </div>
      </div>

      {/* Controls */}
      <div className="mb-5 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
        <Field label="Country">
          <Select<RSOption, false>
            options={toOptions(countries)}
            value={{ label: country, value: country }}
            onChange={(opt) => {
              setCountry(opt?.value || "All")
              setPage(1)
            }}
            theme={selectTheme}
            styles={selectStyles as any}
          />
        </Field>

        <LockedField label="State / Province" locked={country === "All"} note="Select country first">
          <Select<RSOption, false>
            options={toOptions(regions)}
            value={{ label: region, value: region }}
            onChange={(opt) => {
              setRegion(opt?.value || "All")
              setPage(1)
            }}
            isDisabled={country === "All"}
            theme={selectTheme}
            styles={selectStyles as any}
          />
        </LockedField>

        <LockedField label="City" locked={country === "All"} note="Select country first">
          <Select<RSOption, false>
            options={toOptions(cities)}
            value={{ label: city, value: city }}
            onChange={(opt) => {
              setCity(opt?.value || "All")
              setPage(1)
            }}
            isDisabled={country === "All"}
            theme={selectTheme}
            styles={selectStyles as any}
          />
        </LockedField>

        <Field label="Sort by">
          <Select<RSOption, false>
            options={toOptions(["Name (A → Z)", "Name (Z → A)"] as const)}
            value={{ label: sortBy, value: sortBy }}
            onChange={(opt) => setSortBy((opt?.value as SortBy) || "Name (A → Z)")}
            theme={selectTheme}
            styles={selectStyles as any}
          />
        </Field>

        <Field label="Per page">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="h-[38px] w-[120px] rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-indigo-500/50"
          >
            {[12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </Field>

        <div className="flex h-[38px] items-center gap-2">
          <button
            onClick={() => setView("grid")}
            className={`inline-flex h-full items-center gap-1 rounded-xl border px-3 text-sm transition ${
              view === "grid"
                ? "border-indigo-500/60 bg-indigo-600/20"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            title="Grid view"
          >
            <GridIcon className="h-4 w-4" /> Grid
          </button>
          <button
            onClick={() => setView("list")}
            className={`inline-flex h-full items-center gap-1 rounded-xl border px-3 text-sm transition ${
              view === "list"
                ? "border-indigo-500/60 bg-indigo-600/20"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            title="List view"
          >
            <ListIcon className="h-4 w-4" /> List
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex h-full items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm hover:bg-white/10"
            title="Export CSV"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={`grid gap-4 ${view === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={`grid gap-4 ${view === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
          <AnimatePresence mode="popLayout">
            {current.map((s) => (
              <StoreCard key={s.id} s={s} view={view} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
            disabled={pageSafe === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            Page {pageSafe} / {totalPages}
          </span>

          <button
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* -------------------- Pieces -------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-0.5 text-xl font-semibold">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/60">{label}</div>
      {children}
    </label>
  )
}

function LockedField({
  label,
  note,
  locked,
  children,
}: {
  label: React.ReactNode
  note?: string
  locked: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="mb-1 flex items-center gap-1 text-xs text-white/60">
        <span>{label}</span>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      </div>
      <div className="relative">
        {children}
        {locked && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-[#0b1220]/50 backdrop-blur-[1px] grid place-items-center"
            title={note}
          >
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Lock className="h-4 w-4" />
              {note || "Locked"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StoreCard({ s, view }: { s: Store; view: "grid" | "list" }) {
  // Google Maps intent URL
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [s.address, s.city, s.region, s.country].filter(Boolean).join(", ")
  )}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`group isolate overflow-hidden rounded-2xl border border-white/10 bg-white/5 ${
        view === "list" ? "flex" : ""
      }`}
    >
      {/* Accent rail */}
      <div className="hidden md:block w-1.5 bg-gradient-to-b from-indigo-500/60 via-sky-500/60 to-fuchsia-500/60" />

      {/* Body */}
      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          {/* Logo tile */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 grid place-items-center">
            {s.logo ? (
              <img src={s.logo} alt={s.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-white/40" />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10 group-hover:ring-indigo-400/30 transition" />
          </div>

          {/* Title + location */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold leading-tight">{s.name}</h3>
              {s.country && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
                  <Globe2 className="h-3.5 w-3.5" />
                  {s.country}
                </span>
              )}
            </div>
            {(s.city || s.region || s.country) && (
              <div className="mt-1 text-sm text-white/70">
                <MapPin className="mr-1 inline h-4 w-4 translate-y-[1px]" />
                {[s.city, s.region, s.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          {/* Primary action */}
          <div className="ml-auto hidden md:block">
            <Link
              to={`/stores/${s.id}`}
              className="rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm hover:bg-indigo-500"
            >
              View
            </Link>
          </div>
        </div>

        {/* Address */}
        <div className="mt-3 text-sm text-white/70 line-clamp-2">
          {s.address}
          {s.city ? `, ${s.city}` : ""}
          {s.region ? `, ${s.region}` : ""}
          {s.country ? `, ${s.country}` : ""}
        </div>

        {/* Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {s.city && <Chip>{s.city}</Chip>}
          {s.region && <Chip>{s.region}</Chip>}
          {s.country && <Chip>{s.country}</Chip>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            Open in Maps <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Link
            to={`/stores/${s.id}/upcoming`}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600/90 px-3 py-2 text-xs hover:bg-indigo-500"
          >
            Events
          </Link>
          <Link
            to={`/stores/${s.id}`}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 md:hidden"
          >
            View
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{children}</span>
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
        <MapPin className="h-6 w-6 text-white/50" />
      </div>
      <div className="text-lg font-semibold">No stores match your filters</div>
      <div className="mt-1 text-sm text-white/60">Try clearing filters or searching something else.</div>
    </div>
  )
}
