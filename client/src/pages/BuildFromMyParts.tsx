import { useEffect, useMemo, useRef, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* =========================
   Types
========================= */
type Combo = { blade: string; assistBlade?: string; ratchet: string; bit: string }
type ComboStat = Combo & {
  appearances: number
  mostRecentAppearance?: string
}
type Catalog = { blades: string[]; assistBlades: string[]; ratchets: string[]; bits: string[] }
type OwnedParts = {
  blades: Set<string>
  assistBlades: Set<string>
  ratchets: Set<string>
  bits: Set<string>
}
type EventRecord = {
  startTime?: string
  endTime?: string
  topCut?: Array<{ combos?: Combo[] }>
}
type BuiltDeck = {
  combos: ComboStat[]
  grade: {
    score: number
    letter: "S" | "A" | "B" | "C" | "D"
    components: { strength: number; recency: number; diversity: number }
  }
  overlaps: string[]
  note?: string
}

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ")
const bladeConfigKey = (blade: string, assistBlade?: string) =>
  `${norm(blade)}|${norm(assistBlade || "")}`
const comboKey = (c: Combo) =>
  `${bladeConfigKey(c.blade, c.assistBlade)}|${norm(c.ratchet)}|${norm(c.bit)}`
const comboParts = (c: Combo) => [c.blade, c.assistBlade, c.ratchet, c.bit].filter(Boolean) as string[]
const daysSince = (iso?: string) => {
  if (!iso) return Infinity
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Infinity
  return (Date.now() - t) / (1000 * 60 * 60 * 24)
}
const decayFromDays = (d: number, lambda = 60) => (!Number.isFinite(d) ? 0 : Math.exp(-d / lambda))
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/* =========================
   Component
========================= */
export default function BuildFromMyParts() {
  // auth
  const { isAuthenticated } = useAuth()
  const lsToken = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const authToken = lsToken || undefined
  const isLoggedIn = isAuthenticated && !!authToken

  // fetched parts + freq (from events)
  const [catalog, setCatalog] = useState<Catalog>({ blades: [], assistBlades: [], ratchets: [], bits: [] })
  const [bladeFreq, setBladeFreq] = useState<Record<string, number>>({})
  const [assistBladeFreq, setAssistBladeFreq] = useState<Record<string, number>>({})
  const [ratchetFreq, setRatchetFreq] = useState<Record<string, number>>({})
  const [bitFreq, setBitFreq] = useState<Record<string, number>>({})
  const [comboPool, setComboPool] = useState<ComboStat[]>([])
  const [allComboAppearances, setAllComboAppearances] = useState<number[]>([])

  // pair co-occurrence (from real events)
  const [bladeRatchetFreq, setBladeRatchetFreq] = useState<Record<string, number>>({})
  const [bladeBitFreq, setBladeBitFreq] = useState<Record<string, number>>({})
  const [bladeConfigFreq, setBladeConfigFreq] = useState<Record<string, number>>({})

  // user selections
  const [ownedBlades, setOwnedBlades] = useState<string[]>([])
  const [ownedAssistBlades, setOwnedAssistBlades] = useState<string[]>([])
  const [ownedRatchets, setOwnedRatchets] = useState<string[]>([])
  const [ownedBits, setOwnedBits] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // results
  const [built, setBuilt] = useState<{ best?: BuiltDeck; alts: BuiltDeck[] }>({ alts: [] })
  const [building, setBuilding] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [upgradeHints, setUpgradeHints] = useState<string[]>([])

  // save state
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimer = useRef<number | null>(null)

  /* Load from /events → parts, frequencies, full & pair stats */
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`${API}/events`)
        const data = (await res.json()) as EventRecord[]

        // part sets + frequencies
        const bladeSet = new Set<string>()
        const assistBladeSet = new Set<string>()
        const ratchetSet = new Set<string>()
        const bitSet = new Set<string>()
        const bFreq: Record<string, number> = {}
        const aFreq: Record<string, number> = {}
        const rFreq: Record<string, number> = {}
        const btFreq: Record<string, number> = {}

        // combo frequency and most recent
        const comboFreq: Record<string, number> = {}
        const comboRecent: Record<string, string> = {}
        const comboNames: Record<string, Combo> = {}

        // pair frequencies
        const brFreq: Record<string, number> = {} // blade|assist blade|ratchet
        const bbFreq: Record<string, number> = {} // blade|assist blade|bit
        const bcFreq: Record<string, number> = {} // blade|assist blade

        data.forEach((event) => {
          const eventDate = event?.endTime || event?.startTime
          event.topCut?.forEach((player) => {
            player.combos?.forEach((combo) => {
              const { blade, assistBlade, ratchet, bit } = combo || {}
              if (blade) {
                bladeSet.add(blade)
                bFreq[blade] = (bFreq[blade] || 0) + 1
              }
              if (assistBlade) {
                assistBladeSet.add(assistBlade)
                aFreq[assistBlade] = (aFreq[assistBlade] || 0) + 1
              }
              if (ratchet) {
                ratchetSet.add(ratchet)
                rFreq[ratchet] = (rFreq[ratchet] || 0) + 1
              }
              if (bit) {
                bitSet.add(bit)
                btFreq[bit] = (btFreq[bit] || 0) + 1
              }
              const configKey = bladeConfigKey(blade, assistBlade)
              if (blade) bcFreq[configKey] = (bcFreq[configKey] || 0) + 1
              if (blade && ratchet) {
                const key = `${configKey}|${norm(ratchet)}`
                brFreq[key] = (brFreq[key] || 0) + 1
              }
              if (blade && bit) {
                const key = `${configKey}|${norm(bit)}`
                bbFreq[key] = (bbFreq[key] || 0) + 1
              }
              if (blade && ratchet && bit) {
                const exactCombo: Combo = {
                  blade,
                  assistBlade: assistBlade || undefined,
                  ratchet,
                  bit,
                }
                const key = comboKey(exactCombo)
                comboFreq[key] = (comboFreq[key] || 0) + 1
                if (!comboNames[key]) comboNames[key] = exactCombo
                if (eventDate) {
                  const prev = comboRecent[key]
                  if (!prev || new Date(eventDate).getTime() > new Date(prev).getTime()) {
                    comboRecent[key] = eventDate
                  }
                }
              }
            })
          })
        })

        // sorted lists
        const sortByFreq = (arr: string[], map: Record<string, number>) =>
          [...arr].sort((a, b) => (map[b] || 0) - (map[a] || 0))

        const blades = sortByFreq([...bladeSet], bFreq)
        const assistBlades = sortByFreq([...assistBladeSet], aFreq)
        const ratchets = sortByFreq([...ratchetSet], rFreq)
        const bits = sortByFreq([...bitSet], btFreq)

        // combo pool (top-cut only)
        const pool: ComboStat[] = Object.entries(comboFreq)
          .sort((a, b) => b[1] - a[1])
          .map(([key, appearances]) => {
            return {
              ...comboNames[key],
              appearances,
              mostRecentAppearance: comboRecent[key],
            }
          })

        if (!isMounted) return
        setCatalog({ blades, assistBlades, ratchets, bits })
        setBladeFreq(bFreq)
        setAssistBladeFreq(aFreq)
        setRatchetFreq(rFreq)
        setBitFreq(btFreq)
        setComboPool(pool)
        setAllComboAppearances(Object.values(comboFreq))
        setBladeRatchetFreq(brFreq)
        setBladeBitFreq(bbFreq)
        setBladeConfigFreq(bcFreq)
      } catch {
        if (!isMounted) return
        setError("Failed to load parts. Try refresh.")
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [])

  /* Load saved user parts (if logged in) */
  useEffect(() => {
    if (!isLoggedIn) return
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/me/parts`, {
  headers: { Authorization: `Bearer ${authToken}` },
  cache: "no-store",
})


        if (!res.ok) return
        const data = await res.json()
        if (aborted) return
        if (Array.isArray(data?.blades)) setOwnedBlades(data.blades)
        if (Array.isArray(data?.assistBlades)) setOwnedAssistBlades(data.assistBlades)
        if (Array.isArray(data?.ratchets)) setOwnedRatchets(data.ratchets)
        if (Array.isArray(data?.bits)) setOwnedBits(data.bits)
      } catch {
        // silent; page still usable
      }
    })()
    return () => { aborted = true }
  }, [isLoggedIn, authToken])

 // accept an optional payload so we can pass the *next* values
const saveOwnedParts = async (
  payload?: { blades: string[]; assistBlades: string[]; ratchets: string[]; bits: string[] }
) => {
  if (!isLoggedIn) return
  try {
    setSaveState("saving")
    const body = payload ?? {
      blades: ownedBlades,
      assistBlades: ownedAssistBlades,
      ratchets: ownedRatchets,
      bits: ownedBits,
    }
    const res = await fetch(`${API}/me/parts`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("save failed")
    setSaveState("saved")
    setTimeout(() => setSaveState("idle"), 1000)
  } catch {
    setSaveState("error")
    setTimeout(() => setSaveState("idle"), 1500)
  }
}


  const queueSave = (next?: Partial<{
    blades: string[]
    assistBlades: string[]
    ratchets: string[]
    bits: string[]
  }>) => {
  if (!isLoggedIn) return
  const payload = {
    blades: next?.blades ?? ownedBlades,
    assistBlades: next?.assistBlades ?? ownedAssistBlades,
    ratchets: next?.ratchets ?? ownedRatchets,
    bits: next?.bits ?? ownedBits,
  }
  if (saveTimer.current) window.clearTimeout(saveTimer.current)
  saveTimer.current = window.setTimeout(() => saveOwnedParts(payload), 500)
}
useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [])

  const canGenerate =
    ownedBlades.length > 0 && ownedRatchets.length > 0 && ownedBits.length > 0

  /* Build button handler */
  const handleBuild = () => {
    setStatusMsg(null)
    setUpgradeHints([])
    if (!canGenerate) {
      setStatusMsg("Pick at least one Blade, one Ratchet, and one Bit.")
      return
    }

    setBuilding(true)
    setTimeout(() => {
      const owned = {
        blades: new Set(ownedBlades.map(norm)),
        assistBlades: new Set(ownedAssistBlades.map(norm)),
        ratchets: new Set(ownedRatchets.map(norm)),
        bits: new Set(ownedBits.map(norm)),
      }

      // 1) exact meta combos you can build
      const feasible = comboPool.filter(
        (c) =>
          owned.blades.has(norm(c.blade)) &&
          (!c.assistBlade || owned.assistBlades.has(norm(c.assistBlade))) &&
          owned.ratchets.has(norm(c.ratchet)) &&
          owned.bits.has(norm(c.bit))
      )

      // Search the BEST legal deck from feasible (not greedy)
      let finalDecks: BuiltDeck[] = findBestLegalDeck(feasible, allComboAppearances)
      let note: string | undefined

      // 2) If none, fabricate strong candidates from owned parts using pair stats, then search
      if (finalDecks.length === 0) {
        const fabricated = fabricateOwnedCandidates({
          owned,
          bladeOrder: orderOwnedByFreq(ownedBlades, bladeFreq),
          assistBladeOrder: orderOwnedByFreq(ownedAssistBlades, assistBladeFreq),
          ratchetOrder: orderOwnedByFreq(ownedRatchets, ratchetFreq),
          bitOrder: orderOwnedByFreq(ownedBits, bitFreq),
          bladeConfigFreq,
          brFreq: bladeRatchetFreq,
          bbFreq: bladeBitFreq,
          partFreq: { bladeFreq, assistBladeFreq, ratchetFreq, bitFreq },
        })
        finalDecks = findBestLegalDeck(fabricated, allComboAppearances)
        if (finalDecks.length > 0) {
          finalDecks.forEach((d) => (d.note = "Built from your parts"))
          note = "Built from your parts"
        }
      }

      // 3) If still none (not enough unique parts), allow minimal overlap to give *something*
      let hadFallbackOverlap = false
      if (finalDecks.length === 0 && feasible.length > 0) {
        finalDecks = buildMinimalOverlapDecks(feasible, allComboAppearances)
        hadFallbackOverlap = finalDecks.length > 0
      }

      // 4) If absolutely nothing, show upgrade hints
      if (finalDecks.length === 0) {
        setBuilt({ best: undefined, alts: [] })
        setUpgradeHints(suggestMissingParts({
          owned,
          bladeFreq,
          assistBladeFreq,
          ratchetFreq,
          bitFreq,
          catalog,
        }))
        setStatusMsg(
          "No full meta combos can be made from your parts. Add the suggested parts to unlock a competitive deck."
        )
        setBuilding(false)
        return
      }

      // 5) Sort, display
      finalDecks.sort((a, b) => b.grade.score - a.grade.score)
      const best = finalDecks[0]
      if (note && !best.note) best.note = note

      setBuilt({ best, alts: finalDecks.slice(1, 3) })

      if (hadFallbackOverlap) {
        setStatusMsg(
          "We couldn’t make a fully legal 3-combo deck from meta combos you can build, so these include overlapping parts. Add the parts below to reach a legal, competitive deck."
        )
        setUpgradeHints(suggestMissingParts({
          owned,
          bladeFreq,
          assistBladeFreq,
          ratchetFreq,
          bitFreq,
          catalog,
        }))
      } else {
        setStatusMsg(null)
      }

      setBuilding(false)
    }, 0)
  }

  return (
    <>
      <Helmet>
        <title>Build From My Parts — Meta Beys</title>
        <meta
          name="description"
          content="Tell us which parts you own, including CX Assist Blades, and we'll generate the best legal 3-combo deck from real top-cut data."
        />
      </Helmet>

      <div className="p-6 max-w-5xl mx-auto text-white space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Build From My Parts</h1>
        </div>

        <div className="rounded border border-gray-700 p-4 bg-gray-900 space-y-4">
          <h2 className="text-lg font-semibold">Your Parts</h2>

          {loading && <div className="text-sm text-gray-300">Loading parts…</div>}
          {error && <div className="text-sm text-red-300">{error}</div>}

          {!loading && !error && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Blades you own</label>
                  <MultiSelect
                    placeholder="Search blades…"
                    options={catalog.blades}
                    freq={bladeFreq}
                    value={ownedBlades}
                    onChange={(v) => {
                      setOwnedBlades(v)
                      queueSave({ blades:v})
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Assist Blades you own</label>
                  <MultiSelect
                    placeholder="Search assist blades…"
                    options={catalog.assistBlades}
                    freq={assistBladeFreq}
                    value={ownedAssistBlades}
                    onChange={(v) => {
                      setOwnedAssistBlades(v)
                      queueSave({ assistBlades: v })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ratchets you own</label>
                  <MultiSelect
                    placeholder="Search ratchets…"
                    options={catalog.ratchets}
                    freq={ratchetFreq}
                    value={ownedRatchets}
                    onChange={(v) => {
                      setOwnedRatchets(v)
                      queueSave({ratchets: v})
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bits you own</label>
                  <MultiSelect
                    placeholder="Search bits…"
                    options={catalog.bits}
                    freq={bitFreq}
                    value={ownedBits}
                    onChange={(v) => {
                      setOwnedBits(v)
                      queueSave({ bits: v})
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  className={`px-4 py-2 rounded font-semibold ${
                    canGenerate ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 cursor-not-allowed"
                  }`}
                  disabled={!canGenerate || building}
                  onClick={handleBuild}
                >
                  {building ? "Building…" : "Generate Best Deck"}
                </button>
                <button className="text-sm underline text-gray-300" onClick={() => alert("Paste-to-parse coming next.")}>
                  Paste a list instead
                </button>
                <div className="ml-auto text-xs">
                  {!isLoggedIn ? (
                    <span className="text-amber-300">Log in to save your parts.</span>
                  ) : saveState === "saving" ? (
                    <span className="text-gray-300">Saving…</span>
                  ) : saveState === "saved" ? (
                    <span className="text-green-300">Saved ✓</span>
                  ) : saveState === "error" ? (
                    <span className="text-red-300">Save failed.</span>
                  ) : null}
                </div>
              </div>

              {statusMsg && <div className="text-sm text-amber-300 mt-2">{statusMsg}</div>}
            </>
          )}
        </div>

        {(built.best || built.alts.length > 0) && (
          <div className="space-y-4">
            {built.best && <DeckCard deck={built.best} title="Top Recommendation" highlight />}
            {built.alts.length > 0 && (
              <div className="space-y-4">
                {built.alts.map((d, i) => (
                  <DeckCard key={i} deck={d} title={`Alternative ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {upgradeHints.length > 0 && (
          <div className="rounded border border-blue-700 bg-blue-900/10 p-4">
            <h3 className="font-semibold mb-1">Add these parts to make a competitive deck:</h3>
            <p className="text-sm text-gray-300">{upgradeHints.join(" · ")}</p>
          </div>
        )}

        <div className="text-sm text-gray-400">
          <Link to="/tournament-lab" className="link link-primary">
            ← Back to Tournament Lab
          </Link>
        </div>
      </div>
    </>
  )
}

/* =========================
   MultiSelect (searchable)
========================= */
function MultiSelect({
  placeholder,
  options,
  freq,
  value,
  onChange,
}: {
  placeholder: string
  options: string[]
  freq: Record<string, number>
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query) return options
    const q = norm(query)
    return options.filter((o) => norm(o).includes(q))
  }, [options, query])

  const add = (opt: string) => {
    if (value.some((v) => norm(v) === norm(opt))) return
    onChange([...value, opt])
    setQuery("")
    setOpen(false)
  }

  const remove = (opt: string) => {
    onChange(value.filter((v) => norm(v) !== norm(opt)))
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-2 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1">
            {v}
            <button aria-label={`Remove ${v}`} className="opacity-70 hover:opacity-100" onClick={() => remove(v)}>
              ×
            </button>
          </span>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="w-full p-2 bg-black border border-gray-600 rounded"
      />

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 bg-white text-black w-full mt-1 rounded shadow max-h-56 overflow-y-auto">
          {filtered.slice(0, 120).map((opt) => (
            <li
              key={opt}
              className="px-3 py-2 hover:bg-blue-100 cursor-pointer flex items-center justify-between"
              onMouseDown={() => add(opt)}
            >
              <span>{opt}</span>
              {freq[opt] ? <span className="text-xs opacity-70">{freq[opt]}</span> : null}
            </li>
          ))}
          {filtered.length > 120 && (
            <li className="px-3 py-2 text-xs text-gray-600">Showing top 120… refine search</li>
          )}
        </ul>
      )}
    </div>
  )
}

/* =========================
   Deck building utilities
========================= */
function orderOwnedByFreq(list: string[], freq: Record<string, number>) {
  return [...list].sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
}

/* --- Core: find BEST legal deck via small combinational search --- */
function findBestLegalDeck(candidates: ComboStat[], allComboAppearances: number[]): BuiltDeck[] {
  if (candidates.length === 0) return []
  // Score candidates (meta strength + recency)
  const scored = candidates
    .map((c) => ({ c, s: scoreSingleMeta(c, allComboAppearances) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 80) // keep top N for tractable search

  const decks: BuiltDeck[] = []
  for (let i = 0; i < scored.length; i++) {
    const c1 = scored[i].c
    for (let j = i + 1; j < scored.length; j++) {
      const c2 = scored[j].c
      if (!noOverlap([c1], c2)) continue
      for (let k = j + 1; k < scored.length; k++) {
        const c3 = scored[k].c
        if (!noOverlap([c1, c2], c3)) continue
        const deck = [c1, c2, c3]
        const grade = gradeDeck(deck, allComboAppearances)
        decks.push({ combos: deck, grade, overlaps: [] })
      }
    }
  }
  return dedupeDecks(decks)
}

function scoreSingleMeta(c: ComboStat, allComboAppearances: number[]) {
  const p95 = percentile(allComboAppearances, 95)
  const strength = clamp01((c.appearances || 0) / Math.max(1, p95))
  const recency = decayFromDays(daysSince(c.mostRecentAppearance), 60)
  return 0.7 * strength + 0.3 * recency
}

/* --- Fabricate strong combos from owned parts when no exact meta combos work --- */
function fabricateOwnedCandidates(params: {
  owned: OwnedParts
  bladeOrder: string[]
  assistBladeOrder: string[]
  ratchetOrder: string[]
  bitOrder: string[]
  bladeConfigFreq: Record<string, number>
  brFreq: Record<string, number>
  bbFreq: Record<string, number>
  partFreq: {
    bladeFreq: Record<string, number>
    assistBladeFreq: Record<string, number>
    ratchetFreq: Record<string, number>
    bitFreq: Record<string, number>
  }
}): ComboStat[] {
  const {
    owned,
    bladeOrder,
    assistBladeOrder,
    ratchetOrder,
    bitOrder,
    bladeConfigFreq,
    brFreq,
    bbFreq,
    partFreq,
  } = params
  const candidates: ComboStat[] = []
  const seen = new Set<string>()

  const topBlades = bladeOrder.slice(0, 20)
  const topRats = ratchetOrder.slice(0, 20)
  const topBits = bitOrder.slice(0, 20)

  for (const bName of topBlades) {
    const b = norm(bName)
    if (!owned.blades.has(b)) continue

    const configurations: Array<{ assistBlade?: string; frequency: number }> = []
    const regularFrequency = bladeConfigFreq[bladeConfigKey(bName)] || 0
    if (regularFrequency > 0) configurations.push({ frequency: regularFrequency })

    for (const assistBlade of assistBladeOrder) {
      if (!owned.assistBlades.has(norm(assistBlade))) continue
      const frequency = bladeConfigFreq[bladeConfigKey(bName, assistBlade)] || 0
      if (frequency > 0) configurations.push({ assistBlade, frequency })
    }

    for (const configuration of configurations.sort((a, b) => b.frequency - a.frequency).slice(0, 6)) {
      const configKey = bladeConfigKey(bName, configuration.assistBlade)
      const ratOpts = topRats
        .filter((r) => owned.ratchets.has(norm(r)))
        .sort(
          (r1, r2) =>
            (brFreq[`${configKey}|${norm(r2)}`] || 0) -
            (brFreq[`${configKey}|${norm(r1)}`] || 0)
        )
        .slice(0, 6)

      const bitOpts = topBits
        .filter((t) => owned.bits.has(norm(t)))
        .sort(
          (t1, t2) =>
            (bbFreq[`${configKey}|${norm(t2)}`] || 0) -
            (bbFreq[`${configKey}|${norm(t1)}`] || 0)
        )
        .slice(0, 6)

      for (const rName of ratOpts) {
        for (const tName of bitOpts) {
          const combo: Combo = {
            blade: bName,
            assistBlade: configuration.assistBlade,
            ratchet: rName,
            bit: tName,
          }
          const key = comboKey(combo)
          if (seen.has(key)) continue
          seen.add(key)

          const pairScore =
            (brFreq[`${configKey}|${norm(rName)}`] || 0) +
            (bbFreq[`${configKey}|${norm(tName)}`] || 0)
          const popScore =
            (partFreq.bladeFreq[bName] || 0) +
            (configuration.assistBlade
              ? partFreq.assistBladeFreq[configuration.assistBlade] || 0
              : 0) +
            (partFreq.ratchetFreq[rName] || 0) +
            (partFreq.bitFreq[tName] || 0)

          const pseudoAppearances = Math.round(0.6 * pairScore + 0.4 * (popScore / 10))

          candidates.push({
            ...combo,
            appearances: pseudoAppearances,
            mostRecentAppearance: undefined,
          })
        }
      }
    }
  }

  return candidates.sort((a, b) => b.appearances - a.appearances).slice(0, 200)
}

/* --- Minimal-overlap fallback (only when we literally can't build 3 legal) --- */
function buildMinimalOverlapDecks(feasible: ComboStat[], allComboAppearances: number[]) {
  const SEEDS = Math.min(16, feasible.length)
  const seeds = feasible.slice(0, SEEDS)
  const out: BuiltDeck[] = []

  for (let i = 0; i < seeds.length; i++) {
    const c1 = seeds[i]
    const rest = feasible.filter((c) => c !== c1)
    const c2 = pickBestByOverlap(c1, rest)
    if (!c2) continue
    const c3 = pickBestByOverlapMulti([c1, c2], rest.filter((c) => c !== c2))
    if (!c3) continue

    const deck = [c1, c2, c3]
    const overlaps = findOverlaps(deck)
    const graded = gradeDeck(deck, allComboAppearances)
    out.push({ combos: deck, grade: graded, overlaps })
  }
  return dedupeDecks(out)
}

function pickBestByOverlap(anchor: ComboStat, candidates: ComboStat[]) {
  let best: ComboStat | null = null
  let bestOverlap = Infinity
  for (const c of candidates) {
    const ov = overlapCount([anchor], c)
    if (ov < bestOverlap || (ov === bestOverlap && (best?.appearances || 0) < c.appearances)) {
      best = c
      bestOverlap = ov
    }
  }
  return best
}

function pickBestByOverlapMulti(anchors: ComboStat[], candidates: ComboStat[]) {
  let best: ComboStat | null = null
  let bestOverlap = Infinity
  for (const c of candidates) {
    const ov = overlapCount(anchors, c)
    if (ov < bestOverlap || (ov === bestOverlap && (best?.appearances || 0) < c.appearances)) {
      best = c
      bestOverlap = ov
    }
  }
  return best
}

function noOverlap(existing: Combo[], next: Combo) {
  return overlapCount(existing, next) === 0
}

function overlapCount(existing: Combo[], next: Combo) {
  const used = {
    blade: new Set<string>(),
    assistBlade: new Set<string>(),
    ratchet: new Set<string>(),
    bit: new Set<string>(),
  }
  existing.forEach((c) => {
    used.blade.add(norm(c.blade))
    if (c.assistBlade) used.assistBlade.add(norm(c.assistBlade))
    used.ratchet.add(norm(c.ratchet))
    used.bit.add(norm(c.bit))
  })
  return [
    used.blade.has(norm(next.blade)),
    Boolean(next.assistBlade && used.assistBlade.has(norm(next.assistBlade))),
    used.ratchet.has(norm(next.ratchet)),
    used.bit.has(norm(next.bit)),
  ].filter(Boolean).length
}

function findOverlaps(deck: Combo[]) {
  const seen = new Set<string>()
  const overlaps: string[] = []
  deck.forEach((c) => {
    ;([
      ["blade", c.blade],
      ["assist blade", c.assistBlade],
      ["ratchet", c.ratchet],
      ["bit", c.bit],
    ] as const).forEach(([category, part]) => {
      if (!part) return
      const k = `${category}:${norm(part)}`
      if (seen.has(k)) overlaps.push(k)
      else seen.add(k)
    })
  })
  return [...new Set(overlaps)].map((part) => part.slice(part.indexOf(":") + 1))
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 1
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1))))
  return Math.max(1, sorted[idx])
}

/* ===== New helpers for better grading ===== */
function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
function harmonicMean(xs: number[]) {
  const denom = xs.reduce((a, b) => a + (b > 0 ? 1 / b : 0), 0)
  return xs.length && denom > 0 ? xs.length / denom : 0
}

/* ===== Weakest-link-aware grade with safety caps ===== */
function gradeDeck(deck: ComboStat[], allComboAppearances: number[]): BuiltDeck["grade"] {
  const p95 = Math.max(1, percentile(allComboAppearances, 95))

  const strengths: number[] = []
  const recencies: number[] = []
  const comboScores: number[] = []

  for (const c of deck) {
    const rawAppear = Math.max(0, c.appearances || 0)
    // diminishing returns on strength
    const strength_i = Math.pow(Math.min(rawAppear / p95, 1), 0.6) * 100
    // slightly longer half-life than TL
    const recency_i = decayFromDays(daysSince(c.mostRecentAppearance), 75) * 100
    const combo_i = 0.7 * strength_i + 0.3 * recency_i

    strengths.push(strength_i)
    recencies.push(recency_i)
    comboScores.push(combo_i)
  }

  // punish weak link
  const deckStrength = 0.6 * Math.min(...comboScores) + 0.4 * mean(comboScores)
  // stale combo drags hard
  const deckRecency = harmonicMean(recencies)

  // Diversity across every occupied slot, including CX Assist Blades.
  const parts = deck.flatMap(comboParts).map(norm)
  const diversity = Math.round((new Set(parts).size / parts.length) * 100)

  // base score
  let score = Math.round(0.6 * deckStrength + 0.25 * deckRecency + 0.15 * diversity)

  // safety caps (no free S with a shaky third)
  const anyZeroApps = deck.some((c) => (c.appearances || 0) === 0)
  const anyLowApps = deck.some((c) => (c.appearances || 0) < 2)
  const anyStale = deck.some((c) => daysSince(c.mostRecentAppearance) > 180)

  let cap = 100
  if (anyZeroApps) cap = Math.min(cap, 70)
  else if (anyLowApps) cap = Math.min(cap, 85)
  if (anyStale) cap = Math.min(cap, 80)

  score = Math.min(score, cap)

  const letter: BuiltDeck["grade"]["letter"] =
    score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D"

  return {
    score,
    letter,
    components: {
      strength: Math.round(deckStrength),
      recency: Math.round(deckRecency),
      diversity,
    },
  }
}

function dedupeDecks(decks: BuiltDeck[]) {
  const seen = new Set<string>()
  const out: BuiltDeck[] = []
  for (const d of decks) {
    const key = deckSignature(d.combos)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(d)
  }
  return out
}

function deckSignature(cs: Combo[]) {
  return cs.map(comboKey).sort().join("·")
}

/* =========================
   Suggestions to upgrade
========================= */
function suggestMissingParts({
  owned,
  bladeFreq,
  assistBladeFreq,
  ratchetFreq,
  bitFreq,
  catalog,
}: {
  owned: OwnedParts
  bladeFreq: Record<string, number>
  assistBladeFreq: Record<string, number>
  ratchetFreq: Record<string, number>
  bitFreq: Record<string, number>
  catalog: Catalog
}) {
  const topN = (arr: string[], freq: Record<string, number>, ownedSet: Set<string>, n = 5) =>
    arr
      .filter((x) => !ownedSet.has(norm(x)))
      .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
      .slice(0, n)

  const blades = topN(catalog.blades, bladeFreq, owned.blades, 3)
  const assistBlades = topN(catalog.assistBlades, assistBladeFreq, owned.assistBlades, 2)
  const ratchets = topN(catalog.ratchets, ratchetFreq, owned.ratchets, 3)
  const bits = topN(catalog.bits, bitFreq, owned.bits, 3)

  return [
    ...bits.slice(0, 2),
    ...ratchets.slice(0, 1),
    ...assistBlades.slice(0, 1),
    ...blades.slice(0, 1),
  ]
}

/* =========================
   Deck UI
========================= */
function DeckCard({ deck, title, highlight = false }: { deck: BuiltDeck; title: string; highlight?: boolean }) {
  const { score, letter, components } = deck.grade
  const hasOverlap = deck.overlaps.length > 0
  return (
    <div className={`rounded border p-4 ${highlight ? "border-blue-700 bg-blue-900/10" : "border-gray-700 bg-gray-900"}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-right">
          <div className="text-2xl font-extrabold">{letter}</div>
          <div className="text-xs text-gray-400">Score: {score}/100</div>
        </div>
      </div>

      {deck.note && <div className="mb-2 text-xs text-blue-300">{deck.note}</div>}
      {hasOverlap && <div className="mb-3 text-xs text-amber-300">Contains overlapping parts: {deck.overlaps.join(", ")}</div>}

      <div className="grid sm:grid-cols-3 gap-3">
        {deck.combos.map((c, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
            <div className="text-xs text-gray-400 mb-1">Combo {i + 1}</div>
            <div className="font-semibold">{c.blade}</div>
            {c.assistBlade && (
              <div className="text-sky-300">
                {c.assistBlade} <span className="text-xs text-gray-400">(Assist Blade)</span>
              </div>
            )}
            <div className="opacity-90">{c.ratchet}</div>
            <div className="opacity-90">{c.bit}</div>
            <div className="mt-2 text-xs text-gray-400">
              Appearances: <span className="text-white font-semibold">{c.appearances}</span>
              {c.mostRecentAppearance && (
                <>
                  {" "}
                  · Last seen: <span className="text-white">{new Date(c.mostRecentAppearance).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
        <MetricPill label="Strength" value={components.strength} />
        <MetricPill label="Recency" value={components.recency} />
        <MetricPill label="Diversity" value={components.diversity} />
      </div>
    </div>
  )
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex items-center justify-between">
      <span>{label}</span>
      <span className="font-semibold">{Math.round(value)}</span>
    </div>
  )
}
