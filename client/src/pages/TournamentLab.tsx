import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { Link } from "react-router-dom"

const API = import.meta.env.VITE_API_URL

/* =======================================
   Types
======================================= */
type Combo = { blade: string; ratchet: string; bit: string }

type DeckGrade = {
  score: number
  grade: "S" | "A" | "B" | "C" | "D"
  confidence: "Low" | "Medium" | "High"
  components: {
    strength: number
    recency: number
    diversity: number
  }
  reasons: string[]
  partsUniqueRatio: number
}

type ValidationResult = {
  status: "ok" | "incomplete" | "illegal"
  messages: string[]
  missingCombos: number
  duplicateParts: {
    blades: string[]
    ratchets: string[]
    bits: string[]
  }
  recommendations: Combo[]
  swaps: { comboIndex: number; field: keyof Combo; from: string; to: string }[]
}

type GlobalMeta = {
  topCutCombosSorted: Combo[]
  comboAppearancesAll: number[]
}

/* =======================================
   Component
======================================= */
export default function TournamentLab() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const [combos, setCombos] = useState<Combo[]>([
    { blade: "", ratchet: "", bit: "" },
    { blade: "", ratchet: "", bit: "" },
    { blade: "", ratchet: "", bit: "" },
  ])
  const [visibleCombos, setVisibleCombos] = useState(1)

  const [results, setResults] = useState<any[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [previousPrep, setPreviousPrep] = useState<any | null>(null)

  // Parts lists + frequency for swaps
  const [blades, setBlades] = useState<string[]>([])
  const [ratchets, setRatchets] = useState<string[]>([])
  const [bits, setBits] = useState<string[]>([])
  const [bladeFreq, setBladeFreq] = useState<Record<string, number>>({})
  const [ratchetFreq, setRatchetFreq] = useState<Record<string, number>>({})
  const [bitFreq, setBitFreq] = useState<Record<string, number>>({})

    // Global meta (for recs + normalization)
  const [globalMeta, setGlobalMeta] = useState<GlobalMeta>({
    topCutCombosSorted: [],
    comboAppearancesAll: [],
  })

  // === NEW: EventDetail-parity evidence ===
  // Index of combos across all events (appearances, unique events, recency)
  const [comboIndex, setComboIndex] = useState<Record<string, {
    appearances: number
    uniqueEvents: Set<string>
    mostRecent?: string
    firstSeen?: string
  }>>({})

  // p95 baseline input for grading (from appearances across all combos)
  const [tlGlobalMeta, setTlGlobalMeta] = useState<{ comboAppearancesAll: number[] }>({
    comboAppearancesAll: [],
  })


  // Legality + grade
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [deckGrade, setDeckGrade] = useState<DeckGrade | null>(null)

  // Only show warnings after user tries Analyze
  const [hasTriedAnalyze, setHasTriedAnalyze] = useState(false)

  const resultsRef = useRef<HTMLDivElement | null>(null)

  /* =======================================
     Effects
  ======================================= */

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/prep-decks/user/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.combos) setPreviousPrep(data)
      })
      .catch(() => null)
  }, [user])

  // Load events → part sets/freq + global combo counts
  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then((data: any[]) => {
        const bladeSet = new Set<string>()
        const ratchetSet = new Set<string>()
        const bitSet = new Set<string>()

        const bFreq: Record<string, number> = {}
        const rFreq: Record<string, number> = {}
        const btFreq: Record<string, number> = {}

        const comboFreq: Record<string, number> = {}

        data.forEach((event: any) => {
          event.topCut?.forEach((player: any) => {
            player.combos?.forEach((combo: any) => {
              if (combo.blade) {
                bladeSet.add(combo.blade)
                bFreq[combo.blade] = (bFreq[combo.blade] || 0) + 1
              }
              if (combo.ratchet) {
                ratchetSet.add(combo.ratchet)
                rFreq[combo.ratchet] = (rFreq[combo.ratchet] || 0) + 1
              }
              if (combo.bit) {
                bitSet.add(combo.bit)
                btFreq[combo.bit] = (btFreq[combo.bit] || 0) + 1
              }
              if (combo.blade && combo.ratchet && combo.bit) {
                const key = comboKey(combo)
                comboFreq[key] = (comboFreq[key] || 0) + 1
              }
            })
          })
        })

        // Sort by frequency
        const sortByFreq = (arr: string[], map: Record<string, number>) =>
          [...arr].sort((a, b) => (map[b] || 0) - (map[a] || 0))

        setBlades(sortByFreq([...bladeSet], bFreq))
        setRatchets(sortByFreq([...ratchetSet], rFreq))
        setBits(sortByFreq([...bitSet], btFreq))
        setBladeFreq(bFreq)
        setRatchetFreq(rFreq)
        setBitFreq(btFreq)

        // Real top-cut combos (sorted by frequency)
        const topCutCombosSorted: Combo[] = Object.entries(comboFreq)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => parseComboKey(k))

                const comboAppearancesAll = Object.values(comboFreq)

        setGlobalMeta({ topCutCombosSorted, comboAppearancesAll })

        // ---- NEW: Build EventDetail-parity evidence (appearances, recency, p95 inputs) ----
        const idx: Record<string, {
          appearances: number
          uniqueEvents: Set<string>
          mostRecent?: string
          firstSeen?: string
        }> = {}
        const appCounts: number[] = []

        for (const ev of data) {
          const evId = String(ev.id)
          const evDate = ev.endTime || ev.startTime // parity with EventDetail
          ev?.topCut?.forEach((p: any) => {
            p?.combos?.forEach((c: any) => {
              if (!c?.blade || !c?.ratchet || !c?.bit) return
              const key = tlKey({ blade: c.blade, ratchet: c.ratchet, bit: c.bit })
              if (!idx[key]) idx[key] = { appearances: 0, uniqueEvents: new Set<string>() }
              idx[key].appearances += 1
              idx[key].uniqueEvents.add(evId)

              if (evDate) {
                if (!idx[key].mostRecent || new Date(evDate) > new Date(idx[key].mostRecent)) {
                  idx[key].mostRecent = evDate
                }
                if (!idx[key].firstSeen || new Date(evDate) < new Date(idx[key].firstSeen)) {
                  idx[key].firstSeen = evDate
                }
              }
            })
          })
        }

        for (const k of Object.keys(idx)) appCounts.push(idx[k].appearances)

        setComboIndex(idx)
        setTlGlobalMeta({ comboAppearancesAll: appCounts })
        // ---- /NEW ----
      })
      .catch(err => console.error("Failed to load parts", err))
  }, [])

  // Scroll to results when they appear
  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [results])

  /* =======================================
     Handlers
  ======================================= */

  const revalidate = (nextCombos: Combo[]) => {
    setValidation(
      validateDeck({
        combos: nextCombos,
        visibleCombos,
        blades,
        ratchets,
        bits,
        bladeFreq,
        ratchetFreq,
        bitFreq,
        topCutCombosSorted: globalMeta.topCutCombosSorted,
      })
    )
  }

  const updateCombo = (index: number, field: keyof Combo, value: string) => {
    const next = [...combos]
    next[index] = { ...next[index], [field]: value }
    setCombos(next)
    if (hasTriedAnalyze) revalidate(next)
  }

  const removeCombo = () => {
    if (visibleCombos > 1) {
      const nextVisible = visibleCombos - 1
      const trimmed = [...combos]
      trimmed[visibleCombos - 1] = { blade: "", ratchet: "", bit: "" }
      setCombos(trimmed)
      setVisibleCombos(nextVisible)
      if (hasTriedAnalyze) revalidate(trimmed)
    }
  }

  const applySuggestedCombo = (slotIndex: number, c: Combo) => {
    const nextVisible = Math.max(visibleCombos, slotIndex + 1)
    const next = [...combos]
    next[slotIndex] = c
    setCombos(next)
    if (nextVisible !== visibleCombos) setVisibleCombos(nextVisible)
    revalidate(next)
  }

  const applySwap = (comboIndex: number, field: keyof Combo, value: string) => {
    const next = [...combos]
    next[comboIndex] = { ...next[comboIndex], [field]: value }
    setCombos(next)
    revalidate(next)
  }

  const analyzeCombos = async () => {
    setHasTriedAnalyze(true)

    // Validate on click
    const v = validateDeck({
      combos,
      visibleCombos,
      blades,
      ratchets,
      bits,
      bladeFreq,
      ratchetFreq,
      bitFreq,
      topCutCombosSorted: globalMeta.topCutCombosSorted,
    })
    setValidation(v)

    if (v.status !== "ok") {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    const validCombos = combos.slice(0, 3).filter(c => c.blade && c.ratchet && c.bit)
    if (validCombos.length !== 3) {
      alert("Please enter three full combos.")
      return
    }

        setLoadingAnalysis(true)
    try {
      // Build EventDetail-style results locally from comboIndex
      const localResults = validCombos.map(c => {
        const k = tlKey(c)
        const rec = comboIndex[k]
        return {
          submittedCombo: c,
          topCutAppearances: rec?.appearances ?? 0,
          uniqueEvents: rec?.uniqueEvents?.size ?? 0,
          mostRecentAppearance: rec?.mostRecent,
          firstSeen: rec?.firstSeen,
        }
      })

      setResults(localResults)

      setDeckGrade(
        computeDeckGrade({
          results: localResults,
          combos: validCombos,
          visibleCombos: 3,
          // Use the parity p95 baseline computed above
          globalMeta: {
            ...globalMeta, // keep your existing fields for other features
            comboAppearancesAll: tlGlobalMeta.comboAppearancesAll,
          },
        })
      )
    } catch (err) {
      console.error(err)
      alert("Error analyzing combos")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  /* =======================================
     Auth Gates
  ======================================= */

  if (authLoading) {
    return <div className="p-6 text-white">Checking login status...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-white text-center max-w-xl mx-auto mt-12 space-y-4">
        <h1 className="text-2xl font-bold">🔒 Tournament Lab Locked</h1>
        <p className="text-sm text-gray-400">
          You must be logged in to use Tournament Lab and analyze your combos.
        </p>
        <a
          href="/user-auth"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
        >
          Log In to Continue
        </a>
      </div>
    )
  }

  /* =======================================
     UI
  ======================================= */

  return (
    <div className="p-6 text-white max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tournament Lab</h1>
      <p>Prep your deck by entering exactly 3 unique combos below.</p>

      {/* Deck Status / Guidance — only after Analyze, and only if not OK */}
      {hasTriedAnalyze && validation && validation.status !== "ok" && (
        <div
          className={`border rounded p-4 ${
            validation.status === "illegal"
              ? "bg-red-900/30 border-red-700"
              : "bg-yellow-900/30 border-yellow-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {validation.status === "incomplete" && "Deck incomplete — needs attention ⚠️"}
                {validation.status === "illegal" && "Deck illegal — duplicate parts found ❌"}
              </h2>
              <ul className="mt-2 text-sm space-y-1 text-gray-200">
                {validation.messages.map((m, i) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Missing combos → recommendations (from real Top Cut) */}
          {validation.recommendations.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-sm">
                Recommended combo{validation.recommendations.length > 1 ? "s" : ""} to complete your deck:
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {validation.recommendations.map((c, idx) => {
                  const slot = findNextEmptySlot(combos)
                  const targetIndex = slot !== -1 ? slot : Math.min(visibleCombos, 2)
                  const disabled = conflictsWithDeck(c, combos)
                  return (
                    <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-3 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Combo Suggestion {idx + 1}</div>
                        <div className="opacity-90">{c.blade} / {c.ratchet} / {c.bit}</div>
                      </div>
                      <button
                        disabled={disabled}
                        className={`ml-3 whitespace-nowrap px-3 py-1.5 rounded text-sm font-semibold ${
                          disabled ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                        onClick={() => applySuggestedCombo(targetIndex, c)}
                      >
                        {disabled ? "Already in Deck" : `Apply to Combo ${targetIndex + 1}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Duplicates → swaps */}
          {validation.status === "illegal" && validation.swaps.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-sm">Fix duplicate parts with one click:</h3>
              <div className="space-y-2">
                {validation.swaps.map((s, idx) => (
                  <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-3 text-sm flex items-center justify-between">
                    <div>
                      Combo {s.comboIndex + 1} — {capitalize(s.field)}:{" "}
                      <span className="line-through opacity-70">{s.from}</span>{" "}
                      → <span className="font-semibold">{s.to}</span>
                    </div>
                    <button
                      className="ml-3 whitespace-nowrap bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-semibold"
                      onClick={() => applySwap(s.comboIndex, s.field, s.to)}
                    >
                      Replace
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {previousPrep && (
        <div className="bg-gray-900 border border-gray-700 p-4 rounded">
          <h2 className="text-lg font-bold mb-2">Previous Prep Deck</h2>
          {previousPrep.combos.map((combo: any, i: number) => (
            <p key={i} className="text-sm">
              {combo.blade} / {combo.ratchet} / {combo.bit}
            </p>
          ))}
        </div>
      )}

      {/* Combo Inputs */}
      {combos.slice(0, visibleCombos).map((combo, i) => (
        <div key={i} className="space-y-2 border border-gray-700 p-4 rounded-lg">
          <h2 className="font-semibold">Combo {i + 1}</h2>
          <AutoCompleteInput
            label="Blade"
            value={combo.blade}
            options={blades}
            onChange={(val) => updateCombo(i, "blade", val)}
          />
          <AutoCompleteInput
            label="Ratchet"
            value={combo.ratchet}
            options={ratchets}
            onChange={(val) => updateCombo(i, "ratchet", val)}
          />
          <AutoCompleteInput
            label="Bit"
            value={combo.bit}
            options={bits}
            onChange={(val) => updateCombo(i, "bit", val)}
          />
          {visibleCombos > 1 && i === visibleCombos - 1 && (
            <button
              onClick={removeCombo}
              className="text-red-400 text-sm underline mt-2"
            >
              Remove Combo
            </button>
          )}
        </div>
      ))}

      {visibleCombos < 3 && (
        <button
          onClick={() => setVisibleCombos(visibleCombos + 1)}
          className="text-blue-400 text-sm underline"
        >
          + Add Combo
        </button>
      )}

      <div className="flex space-x-4">
        <button
          onClick={analyzeCombos}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
          disabled={loadingAnalysis}
        >
          {loadingAnalysis ? "Analyzing..." : "Analyze Combos"}
        </button>

        {/* CTA to Builder */}
        <Link
          to="/build-from-my-parts"
          className="px-4 py-2 rounded font-semibold border border-blue-600 text-blue-300 hover:bg-blue-600/10"
        >
          Build From My Parts
        </Link>
      </div>

      {/* Deck Grade Card */}
      {deckGrade && (
        <div className="mt-6 bg-gray-900 border border-gray-700 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Deck Grade</h2>
              <p className="text-sm text-gray-400">
                Score: <span className="font-semibold text-white">{deckGrade.score}</span> / 100
                {" · "}
                Confidence: <span className="font-semibold">{deckGrade.confidence}</span>
              </p>
            </div>
            <div className="text-3xl font-extrabold">
              {deckGrade.grade}
            </div>
          </div>

          <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
            <MetricPill label="Strength" value={deckGrade.components.strength} />
            <MetricPill label="Recency" value={deckGrade.components.recency} />
            <MetricPill label="Diversity" value={deckGrade.components.diversity} />
          </div>

          <div className="mt-3 grid sm:grid-cols-3 gap-2">
            {deckGrade.reasons.slice(0, 3).map((reason, i) => (
              <div key={i} className="text-sm bg-gray-800 rounded px-3 py-2 border border-gray-700">
                {reason}
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Parts diversity: {(deckGrade.partsUniqueRatio * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Raw Results */}
      {results.length > 0 && (
        <div ref={resultsRef} className="space-y-4 mt-6">
          <h2 className="text-xl font-bold">Top Cut Stats (Global)</h2>
          {results.map((r, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded space-y-2">
              <p className="font-semibold">
                Your Combo: {r.submittedCombo.blade} / {r.submittedCombo.ratchet} / {r.submittedCombo.bit}
              </p>
              <p>Top Cut Appearances: <strong>{r.topCutAppearances}</strong></p>
              <p>Unique Events: <strong>{r.uniqueEvents}</strong></p>
              <p>Most Recent Appearance: <strong>{r.mostRecentAppearance || "N/A"}</strong></p>
              <p>First Seen: <strong>{r.firstSeen || "N/A"}</strong></p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =======================================
   Inputs
======================================= */

function AutoCompleteInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = options.filter(
    (opt) => value && opt.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={label}
        className="w-full p-2 bg-black border border-gray-600 rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
      />
      {showDropdown && matches.length > 0 && (
        <ul className="absolute z-10 bg-white text-black w-full mt-1 rounded shadow max-h-48 overflow-y-auto">
          {matches.map((opt, idx) => (
            <li
              key={idx}
              className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
              onMouseDown={() => {
                onChange(opt)
                setShowDropdown(false)
              }}
            >
              {highlightMatch(opt, value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function highlightMatch(text: string, input: string) {
  const i = text.toLowerCase().indexOf(input.toLowerCase())
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <strong>{text.slice(i, i + input.length)}</strong>
      {text.slice(i + input.length)}
    </>
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

/* =======================================
   Validation / Suggestions
======================================= */

function normalize(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

function comboKey(c: Combo) {
  return `${normalize(c.blade)}|${normalize(c.ratchet)}|${normalize(c.bit)}`
}

// EventDetail-parity key (same normalization here; alias keeps intent clear)
const tlKey = comboKey


function parseComboKey(key: string): Combo {
  const [blade, ratchet, bit] = key.split("|")
  return { blade, ratchet, bit }
}

function findNextEmptySlot(combos: Combo[]) {
  for (let i = 0; i < 3; i++) {
    const c = combos[i]
    if (!c) return i
    if (!c.blade || !c.ratchet || !c.bit) return i
  }
  return -1
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function uniquePartsByCategory(slice: Combo[]) {
  const blades = new Set<string>()
  const ratchets = new Set<string>()
  const bits = new Set<string>()
  slice.forEach(c => {
    if (c.blade) blades.add(normalize(c.blade))
    if (c.ratchet) ratchets.add(normalize(c.ratchet))
    if (c.bit) bits.add(normalize(c.bit))
  })
  return { blades, ratchets, bits }
}

function duplicatesByCategory(slice: Combo[]) {
  const count = (arr: string[]) => {
    const map: Record<string, number> = {}
    arr.forEach(v => { map[normalize(v)] = (map[normalize(v)] || 0) + 1 })
    return Object.entries(map).filter(([, n]) => n > 1).map(([k]) => k)
  }
  const blades: string[] = []
  const ratchets: string[] = []
  const bits: string[] = []
  slice.forEach(c => {
    if (c.blade) blades.push(c.blade)
    if (c.ratchet) ratchets.push(c.ratchet)
    if (c.bit) bits.push(c.bit)
  })
  return {
    blades: count(blades),
    ratchets: count(ratchets),
    bits: count(bits),
  }
}

// Recommend *real* combos that have actually appeared in Top Cut
function recommendMissingCombosFromTopCut(params: {
  count: number
  currentCombos: Combo[]
  topCutCombosSorted: Combo[]
}) {
  const { count, currentCombos, topCutCombosSorted } = params
  const used = uniquePartsByCategory(currentCombos.slice(0, 3))
  const currentKeys = new Set(currentCombos.slice(0, 3).map(comboKey))

  const recs: Combo[] = []
  for (const cand of topCutCombosSorted) {
    if (recs.length >= count) break
    const key = comboKey(cand)
    if (currentKeys.has(key)) continue
    const b = normalize(cand.blade)
    const r = normalize(cand.ratchet)
    const bt = normalize(cand.bit)
    if (used.blades.has(b) || used.ratchets.has(r) || used.bits.has(bt)) continue
    recs.push(cand)
    used.blades.add(b); used.ratchets.add(r); used.bits.add(bt)
  }
  return recs
}

function proposeSwapsForDuplicates(params: {
  combos: Combo[]
  dupes: { blades: string[]; ratchets: string[]; bits: string[] }
  topBlades: string[]
  topRatchets: string[]
  topBits: string[]
}) {
  const { combos, dupes, topBlades, topRatchets, topBits } = params
  const swaps: { comboIndex: number; field: keyof Combo; from: string; to: string }[] = []

  const used = uniquePartsByCategory(combos)

  const propose = (field: keyof Combo, dupVals: string[], topList: string[], usedSet: Set<string>) => {
    dupVals.forEach(dup => {
      const idx = combos.findIndex(c => normalize(c[field]) === normalize(dup))
      if (idx === -1) return
      const alt = topList.find(x => normalize(x) !== normalize(dup) && !usedSet.has(normalize(x)))
      if (!alt) return
      swaps.push({ comboIndex: idx, field, from: combos[idx][field], to: alt })
      usedSet.add(normalize(alt))
    })
  }

  propose("blade", dupes.blades, topBlades, used.blades)
  propose("ratchet", dupes.ratchets, topRatchets, used.ratchets)
  propose("bit", dupes.bits, topBits, used.bits)

  return swaps
}

function validateDeck(args: {
  combos: Combo[]
  visibleCombos: number
  blades: string[]
  ratchets: string[]
  bits: string[]
  bladeFreq: Record<string, number>
  ratchetFreq: Record<string, number>
  bitFreq: Record<string, number>
  topCutCombosSorted: Combo[]
}): ValidationResult {
  const { combos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted } = args

  const full = combos.slice(0, 3).map(c => Boolean(c.blade && c.ratchet && c.bit))
  const fullCount = full.filter(Boolean).length

  const messages: string[] = []
  let status: ValidationResult["status"] = "ok"

  // Must be exactly 3 full combos
  if (fullCount < 3) {
    status = "incomplete"
    const missing = 3 - fullCount
    messages.push(`You have ${fullCount}/3 complete combos. Add ${missing} more unique combo${missing > 1 ? "s" : ""}.`)
  }

  // No duplicate parts across combos (by category)
  const dupes = duplicatesByCategory(combos.slice(0, 3))
  const hasDupes = dupes.blades.length + dupes.ratchets.length + dupes.bits.length > 0
  if (hasDupes) {
    status = "illegal"
    const list: string[] = []
    if (dupes.blades.length) list.push(`Blades: ${dupes.blades.join(", ")}`)
    if (dupes.ratchets.length) list.push(`Ratchets: ${dupes.ratchets.join(", ")}`)
    if (dupes.bits.length) list.push(`Bits: ${dupes.bits.join(", ")}`)
    messages.push(`Duplicate parts detected — deck is illegal. (${list.join(" · ")})`)
  }

  // Incomplete → recommend real top-cut combos that don't conflict
  let recommendations: Combo[] = []
  if (status === "incomplete") {
    const missing = 3 - fullCount
    recommendations = recommendMissingCombosFromTopCut({
      count: missing,
      currentCombos: combos,
      topCutCombosSorted,
    })
    if (recommendations.length === 0 && topCutCombosSorted.length > 0) {
      messages.push("No non-conflicting top-cut combos found. Try changing one part to open up options.")
    }
  }

  // Illegal → propose swaps
  let swaps: ValidationResult["swaps"] = []
  if (status === "illegal") {
    swaps = proposeSwapsForDuplicates({
      combos,
      dupes,
      topBlades: sortByFreqArray(blades, bladeFreq),
      topRatchets: sortByFreqArray(ratchets, ratchetFreq),
      topBits: sortByFreqArray(bits, bitFreq),
    })
    if (swaps.length === 0) {
      messages.push("No safe automatic swaps available — try changing one duplicated part to a different popular option.")
    } else {
      messages.push("Use the suggestions below to fix duplicates automatically.")
    }
  }

  if (status === "ok" && visibleCombos < 3) {
    messages.push("Tip: Keep all 3 combos visible for quick edits.")
  }

  return {
    status,
    messages,
    missingCombos: Math.max(0, 3 - fullCount),
    duplicateParts: dupes,
    recommendations,
    swaps,
  }
}

function sortByFreqArray(arr: string[], map: Record<string, number>) {
  return [...arr].sort((a, b) => (map[b] || 0) - (map[a] || 0))
}

function conflictsWithDeck(c: Combo, deck: Combo[]) {
  const used = uniquePartsByCategory(deck.slice(0, 3))
  return (
    used.blades.has(normalize(c.blade)) ||
    used.ratchets.has(normalize(c.ratchet)) ||
    used.bits.has(normalize(c.bit)) ||
    deck.slice(0, 3).some(d => comboKey(d) === comboKey(c))
  )
}

/* =======================================
   Deck Grade (no coverage)
======================================= */

function daysSince(iso?: string) {
  if (!iso) return Infinity
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return Infinity
  // If future-dated, treat as "0 days ago" to avoid >100 recency
  return Math.max(0, (Date.now() - d) / (1000 * 60 * 60 * 24))
}

function decayFromDays(days: number, lambda = 60) {
  if (!Number.isFinite(days)) return 0
  return Math.exp(-days / lambda)
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function mapScoreToGrade(score: number): DeckGrade["grade"] {
  if (score >= 90) return "S"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  return "D"
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 1
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1))))
  return Math.max(1, sorted[idx])
}

/* === helpers mirroring BuildFromMyParts grading === */
function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
function harmonicMean(xs: number[]) {
  const pos = xs.filter(v => v > 0)
  if (pos.length === 0) return 0
  const denom = pos.reduce((a, b) => a + 1 / b, 0)
  return pos.length / denom
}
function computeDeckGrade({
  results,
  combos,
  visibleCombos,
  globalMeta,
}: {
  results: any[]
  combos: Combo[]
  visibleCombos: number
  globalMeta: GlobalMeta
}): DeckGrade | null {
  if (!results || results.length === 0) return null

  const used = results.slice(0, Math.min(3, visibleCombos))

  // Per-combo strength/recency (diminishing returns + slightly longer half-life)
  const p95 = Math.max(1, percentile(globalMeta.comboAppearancesAll, 95))
  const recencies: number[] = []
  const comboScores: number[] = []

  for (const r of used) {
    const appearances = Math.max(0, Number(r?.topCutAppearances ?? 0))
    const mostRecent = r?.mostRecentAppearance as string | undefined

    const strength_i = Math.pow(Math.min(appearances / p95, 1), 0.60) * 100
    const recency_i = clamp01(decayFromDays(daysSince(mostRecent), 75)) * 100 // ← clamp here

    recencies.push(recency_i)
    comboScores.push(0.70 * strength_i + 0.30 * recency_i)
  }

  // Weakest-link penalty + average
  const deckStrength = 0.60 * Math.min(...comboScores) + 0.40 * mean(comboScores)
  // Stale combo drags the deck (also clamp to [0,100] to be safe)
  const deckRecency = Math.max(0, Math.min(100, harmonicMean(recencies)))

  // Diversity
  const slice = combos.slice(0, Math.min(3, visibleCombos))
  const parts = slice.flatMap(c => [c.blade, c.ratchet, c.bit]).filter(Boolean)
  const unique = new Set(parts.map(normalize)).size
  const partsUniqueRatio = parts.length ? unique / parts.length : 0
  const diversity = Math.round(partsUniqueRatio * 100)

  // Base score (no coverage)
  let score = Math.round(0.60 * deckStrength + 0.25 * deckRecency + 0.15 * diversity)

  // Safety caps — no free S with a shaky third
  const anyZeroApps = used.some(r => Number(r?.topCutAppearances ?? 0) === 0)
  const anyLowApps  = used.some(r => Number(r?.topCutAppearances ?? 0) < 2)
  const anyStale    = used.some(r => daysSince(r?.mostRecentAppearance) > 180)

  let cap = 100
  if (anyZeroApps) cap = Math.min(cap, 70)
  else if (anyLowApps) cap = Math.min(cap, 85)
  if (anyStale) cap = Math.min(cap, 80)

  score = Math.min(score, cap)

  const grade = mapScoreToGrade(score)

  // Confidence by total appearances evidence
  const totalAppearances = used.reduce((a, r) => a + Number(r?.topCutAppearances ?? 0), 0)
  const confidence: DeckGrade["confidence"] =
    totalAppearances >= 30 ? "High" : totalAppearances >= 10 ? "Medium" : "Low"

  // Reasons
  const reasons: string[] = []
  if (deckStrength >= 70) reasons.push("Strong historical appearances")
  else if (deckStrength >= 40) reasons.push("Moderate historical strength")
  else reasons.push("Low historical strength")

  if (deckRecency >= 70) reasons.push("Recently active in top cut")
  else if (deckRecency >= 40) reasons.push("Some recent activity")
  else reasons.push("Stale — few recent appearances")

  if (diversity >= 70) reasons.push("Good part diversity")
  else if (diversity >= 40) reasons.push("Okay diversity")
  else reasons.push("Redundant parts — consider varying picks")

  return {
    score,
    grade,
    confidence,
    components: {
      strength: Math.round(deckStrength),
      recency: Math.round(deckRecency),
      diversity,
    },
    reasons,
    partsUniqueRatio,
  }
}
