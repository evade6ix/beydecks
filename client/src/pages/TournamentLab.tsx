import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { Link } from "react-router-dom"

const API = import.meta.env.VITE_API_URL

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type Combo = { blade: string; ratchet: string; bit: string }

type DeckGrade = {
  score: number
  grade: "S" | "A" | "B" | "C" | "D"
  confidence: "Low" | "Medium" | "High"
  components: { strength: number; recency: number; diversity: number }
  reasons: string[]
  partsUniqueRatio: number
}

type ValidationResult = {
  status: "ok" | "incomplete" | "illegal"
  messages: string[]
  missingCombos: number
  duplicateParts: { blades: string[]; ratchets: string[]; bits: string[] }
  recommendations: Combo[]
  swaps: { comboIndex: number; field: keyof Combo; from: string; to: string }[]
}

type GlobalMeta = {
  topCutCombosSorted: Combo[]
  comboAppearancesAll: number[]
}

/* ─────────────────────────────────────────
   Pure helpers (no UI)
───────────────────────────────────────── */
function normalize(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}
function comboKey(c: Combo) {
  return `${normalize(c.blade)}|${normalize(c.ratchet)}|${normalize(c.bit)}`
}
const tlKey = comboKey
function parseComboKey(key: string): Combo {
  const [blade, ratchet, bit] = key.split("|")
  return { blade, ratchet, bit }
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function findNextEmptySlot(combos: Combo[]) {
  for (let i = 0; i < 3; i++) {
    const c = combos[i]
    if (!c || !c.blade || !c.ratchet || !c.bit) return i
  }
  return -1
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
  const blades: string[] = [], ratchets: string[] = [], bits: string[] = []
  slice.forEach(c => {
    if (c.blade) blades.push(c.blade)
    if (c.ratchet) ratchets.push(c.ratchet)
    if (c.bit) bits.push(c.bit)
  })
  return { blades: count(blades), ratchets: count(ratchets), bits: count(bits) }
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
function recommendMissingCombosFromTopCut(params: { count: number; currentCombos: Combo[]; topCutCombosSorted: Combo[] }) {
  const { count, currentCombos, topCutCombosSorted } = params
  const used = uniquePartsByCategory(currentCombos.slice(0, 3))
  const currentKeys = new Set(currentCombos.slice(0, 3).map(comboKey))
  const recs: Combo[] = []
  for (const cand of topCutCombosSorted) {
    if (recs.length >= count) break
    const key = comboKey(cand)
    if (currentKeys.has(key)) continue
    const b = normalize(cand.blade), r = normalize(cand.ratchet), bt = normalize(cand.bit)
    if (used.blades.has(b) || used.ratchets.has(r) || used.bits.has(bt)) continue
    recs.push(cand)
    used.blades.add(b); used.ratchets.add(r); used.bits.add(bt)
  }
  return recs
}
function proposeSwapsForDuplicates(params: {
  combos: Combo[]; dupes: { blades: string[]; ratchets: string[]; bits: string[] }
  topBlades: string[]; topRatchets: string[]; topBits: string[]
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
  combos: Combo[]; visibleCombos: number; blades: string[]; ratchets: string[]
  bits: string[]; bladeFreq: Record<string, number>; ratchetFreq: Record<string, number>
  bitFreq: Record<string, number>; topCutCombosSorted: Combo[]
}): ValidationResult {
  const { combos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted } = args
  const full = combos.slice(0, 3).map(c => Boolean(c.blade && c.ratchet && c.bit))
  const fullCount = full.filter(Boolean).length
  const messages: string[] = []
  let status: ValidationResult["status"] = "ok"

  if (fullCount < 3) {
    status = "incomplete"
    const missing = 3 - fullCount
    messages.push(`${fullCount}/3 combos complete. Add ${missing} more.`)
  }

  const dupes = duplicatesByCategory(combos.slice(0, 3))
  const hasDupes = dupes.blades.length + dupes.ratchets.length + dupes.bits.length > 0
  if (hasDupes) {
    status = "illegal"
    const list: string[] = []
    if (dupes.blades.length) list.push(`Blades: ${dupes.blades.join(", ")}`)
    if (dupes.ratchets.length) list.push(`Ratchets: ${dupes.ratchets.join(", ")}`)
    if (dupes.bits.length) list.push(`Bits: ${dupes.bits.join(", ")}`)
    messages.push(`Duplicate parts — ${list.join(" · ")}`)
  }

  let recommendations: Combo[] = []
  if (status === "incomplete") {
    const missing = 3 - fullCount
    recommendations = recommendMissingCombosFromTopCut({ count: missing, currentCombos: combos, topCutCombosSorted })
    if (recommendations.length === 0 && topCutCombosSorted.length > 0) {
      messages.push("No non-conflicting top-cut combos found. Try changing a part.")
    }
  }

  let swaps: ValidationResult["swaps"] = []
  if (status === "illegal") {
    swaps = proposeSwapsForDuplicates({
      combos, dupes,
      topBlades: sortByFreqArray(blades, bladeFreq),
      topRatchets: sortByFreqArray(ratchets, ratchetFreq),
      topBits: sortByFreqArray(bits, bitFreq),
    })
    if (swaps.length === 0) messages.push("No auto-swaps available — manually change a duplicated part.")
    else messages.push("Quick-fix suggestions available below.")
  }

  if (status === "ok" && visibleCombos < 3) messages.push("Tip: Keep all 3 combos visible for quick edits.")

  return { status, messages, missingCombos: Math.max(0, 3 - fullCount), duplicateParts: dupes, recommendations, swaps }
}

/* ─────────────────────────────────────────
   Grade helpers
───────────────────────────────────────── */
function daysSince(iso?: string) {
  if (!iso) return Infinity
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return Infinity
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
function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
function computeDeckGrade({ results, combos, visibleCombos, globalMeta }: {
  results: any[]; combos: Combo[]; visibleCombos: number; globalMeta: GlobalMeta
}): DeckGrade | null {
  if (!results || results.length === 0) return null
  const used = results.slice(0, Math.min(3, visibleCombos))
  const p95 = Math.max(1, percentile(globalMeta.comboAppearancesAll, 95))
  const recencies: number[] = []
  const comboScores: number[] = []

  for (const r of used) {
    const appearances = Math.max(0, Number(r?.topCutAppearances ?? 0))
    const mostRecent = r?.mostRecentAppearance as string | undefined
    const strength_i = Math.pow(Math.min(appearances / p95, 1), 0.60) * 100
    const recency_i = clamp01(decayFromDays(daysSince(mostRecent), 75)) * 100
    recencies.push(recency_i)
    comboScores.push(0.70 * strength_i + 0.30 * recency_i)
  }

  const deckStrength = 0.60 * Math.min(...comboScores) + 0.40 * mean(comboScores)
  const deckRecency = 0.60 * Math.min(...recencies) + 0.40 * mean(recencies)
  const slice = combos.slice(0, Math.min(3, visibleCombos))
  const parts = slice.flatMap(c => [c.blade, c.ratchet, c.bit]).filter(Boolean)
  const unique = new Set(parts.map(normalize)).size
  const partsUniqueRatio = parts.length ? unique / parts.length : 0
  const diversity = Math.round(partsUniqueRatio * 100)

  let score = Math.round(0.60 * deckStrength + 0.25 * deckRecency + 0.15 * diversity)

  const anyZeroApps = used.some(r => Number(r?.topCutAppearances ?? 0) === 0)
  const anyLowApps = used.some(r => Number(r?.topCutAppearances ?? 0) < 2)
  const anyStale = used.some(r => daysSince(r?.mostRecentAppearance) > 180)

  let cap = 100
  if (anyZeroApps) cap = Math.min(cap, 70)
  else if (anyLowApps) cap = Math.min(cap, 85)
  if (anyStale) cap = Math.min(cap, 80)
  score = Math.min(score, cap)

  const grade = mapScoreToGrade(score)
  const totalAppearances = used.reduce((a, r) => a + Number(r?.topCutAppearances ?? 0), 0)
  const confidence: DeckGrade["confidence"] = totalAppearances >= 30 ? "High" : totalAppearances >= 10 ? "Medium" : "Low"

  const reasons: string[] = []
  if (deckStrength >= 70) reasons.push("Strong historical appearances")
  else if (deckStrength >= 40) reasons.push("Moderate historical strength")
  else reasons.push("Low historical strength")
  if (deckRecency >= 70) reasons.push("Recently active in top cut")
  else if (deckRecency >= 40) reasons.push("Some recent activity")
  else reasons.push("Stale — few recent appearances")
  if (diversity >= 70) reasons.push("Excellent part diversity")
  else if (diversity >= 40) reasons.push("Moderate diversity")
  else reasons.push("Redundant parts detected")

  return {
    score, grade, confidence,
    components: { strength: Math.round(deckStrength), recency: Math.round(deckRecency), diversity },
    reasons, partsUniqueRatio,
  }
}
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) }
  catch { return "—" }
}

/* ─────────────────────────────────────────
   AutoComplete Part Input
───────────────────────────────────────── */
function PartInput({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const matches = options.filter(o => value && o.toLowerCase().includes(value.toLowerCase()))

  return (
    <div className="tl-pinput-wrap">
      <div className="tl-pinput-row">
        <span className="tl-pinput-label">{label}</span>
        <div className="tl-pinput-inner">
          <input
            className="tl-pinput"
            type="text"
            value={value}
            placeholder={`Search ${label}...`}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
          />
          {value && (
            <button className="tl-pinput-clear" onClick={() => onChange("")} type="button">
              &#x00D7;
            </button>
          )}
        </div>
      </div>
      {open && matches.length > 0 && (
        <ul className="tl-dropdown" role="listbox">
          {matches.slice(0, 10).map((opt, i) => (
            <li
              key={i}
              className="tl-dropdown-item"
              role="option"
              onMouseDown={() => { onChange(opt); setOpen(false) }}
            >
              {(() => {
                const idx = opt.toLowerCase().indexOf(value.toLowerCase())
                if (idx === -1) return opt
                return (
                  <>
                    {opt.slice(0, idx)}
                    <strong className="tl-match">{opt.slice(idx, idx + value.length)}</strong>
                    {opt.slice(idx + value.length)}
                  </>
                )
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Grade colour map
───────────────────────────────────────── */
const GRADE_COLOR: Record<string, string> = {
  S: "#FACC15",
  A: "#4ADE80",
  B: "#38BDF8",
  C: "#FB923C",
  D: "#F87171",
}

/* ─────────────────────────────────────────
   Main
───────────────────────────────────────── */
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

  const [blades, setBlades] = useState<string[]>([])
  const [ratchets, setRatchets] = useState<string[]>([])
  const [bits, setBits] = useState<string[]>([])
  const [bladeFreq, setBladeFreq] = useState<Record<string, number>>({})
  const [ratchetFreq, setRatchetFreq] = useState<Record<string, number>>({})
  const [bitFreq, setBitFreq] = useState<Record<string, number>>({})

  const [globalMeta, setGlobalMeta] = useState<GlobalMeta>({ topCutCombosSorted: [], comboAppearancesAll: [] })
  const [comboIndex, setComboIndex] = useState<Record<string, {
    appearances: number; uniqueEvents: Set<string>; mostRecent?: string; firstSeen?: string
  }>>({})
  const [tlGlobalMeta, setTlGlobalMeta] = useState<{ comboAppearancesAll: number[] }>({ comboAppearancesAll: [] })

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [deckGrade, setDeckGrade] = useState<DeckGrade | null>(null)
  const [hasTriedAnalyze, setHasTriedAnalyze] = useState(false)

  const resultsRef = useRef<HTMLDivElement | null>(null)

  function buildResultsFromIndex(cs: Combo[], index: typeof comboIndex, includeSelf: boolean) {
    const nowIso = new Date().toISOString()
    return cs.map(c => {
      const k = tlKey(c)
      const rec = index[k]
      let appearances = rec?.appearances ?? 0
      let uniqueEvents = rec?.uniqueEvents?.size ?? 0
      let mostRecent = rec?.mostRecent
      let firstSeen = rec?.firstSeen
      if (includeSelf) {
        appearances++; uniqueEvents++; mostRecent = nowIso
        if (!firstSeen) firstSeen = nowIso
      }
      return { submittedCombo: c, topCutAppearances: appearances, uniqueEvents, mostRecentAppearance: mostRecent, firstSeen }
    })
  }

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/prep-decks/user/${user.id}`)
      .then(r => r.json())
      .then(d => { if (d?.combos) setPreviousPrep(d) })
      .catch(() => null)
  }, [user])

  useEffect(() => {
    fetch(`${API}/events`)
      .then(r => r.json())
      .then((data: any[]) => {
        const bSet = new Set<string>(), rSet = new Set<string>(), btSet = new Set<string>()
        const bF: Record<string, number> = {}, rF: Record<string, number> = {}, btF: Record<string, number> = {}
        const cF: Record<string, number> = {}

        data.forEach(ev => {
          ev.topCut?.forEach((p: any) => {
            p.combos?.forEach((c: any) => {
              if (c.blade) { bSet.add(c.blade); bF[c.blade] = (bF[c.blade] || 0) + 1 }
              if (c.ratchet) { rSet.add(c.ratchet); rF[c.ratchet] = (rF[c.ratchet] || 0) + 1 }
              if (c.bit) { btSet.add(c.bit); btF[c.bit] = (btF[c.bit] || 0) + 1 }
              if (c.blade && c.ratchet && c.bit) { const k = comboKey(c); cF[k] = (cF[k] || 0) + 1 }
            })
          })
        })

        const byFreq = (a: string[], m: Record<string, number>) => [...a].sort((x, y) => (m[y] || 0) - (m[x] || 0))
        setBlades(byFreq([...bSet], bF)); setRatchets(byFreq([...rSet], rF)); setBits(byFreq([...btSet], btF))
        setBladeFreq(bF); setRatchetFreq(rF); setBitFreq(btF)
        const topCutCombosSorted = Object.entries(cF).sort((a, b) => b[1] - a[1]).map(([k]) => parseComboKey(k))
        setGlobalMeta({ topCutCombosSorted, comboAppearancesAll: Object.values(cF) })

        const idx: typeof comboIndex = {}; const appCounts: number[] = []
        for (const ev of data) {
          const evId = String(ev.id); const evDate = ev.endTime || ev.startTime
          ev?.topCut?.forEach((p: any) => {
            p?.combos?.forEach((c: any) => {
              if (!c?.blade || !c?.ratchet || !c?.bit) return
              const k = tlKey({ blade: c.blade, ratchet: c.ratchet, bit: c.bit })
              if (!idx[k]) idx[k] = { appearances: 0, uniqueEvents: new Set<string>() }
              idx[k].appearances++; idx[k].uniqueEvents.add(evId)
              if (evDate) {
                if (!idx[k].mostRecent || new Date(evDate) > new Date(idx[k].mostRecent!)) idx[k].mostRecent = evDate
                if (!idx[k].firstSeen || new Date(evDate) < new Date(idx[k].firstSeen!)) idx[k].firstSeen = evDate
              }
            })
          })
        }
        for (const k of Object.keys(idx)) appCounts.push(idx[k].appearances)
        setComboIndex(idx); setTlGlobalMeta({ comboAppearancesAll: appCounts })
      })
      .catch(e => console.error("Failed to load events", e))
  }, [])

  useEffect(() => {
    if (results.length > 0 && resultsRef.current) resultsRef.current.scrollIntoView({ behavior: "smooth" })
  }, [results])

  const revalidate = (next: Combo[]) =>
    setValidation(validateDeck({ combos: next, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted: globalMeta.topCutCombosSorted }))

  const updateCombo = (i: number, field: keyof Combo, val: string) => {
    const next = [...combos]; next[i] = { ...next[i], [field]: val }; setCombos(next)
    if (hasTriedAnalyze) revalidate(next)
  }
  const removeCombo = () => {
    if (visibleCombos <= 1) return
    const nv = visibleCombos - 1; const t = [...combos]; t[visibleCombos - 1] = { blade: "", ratchet: "", bit: "" }
    setCombos(t); setVisibleCombos(nv)
    if (hasTriedAnalyze) revalidate(t)
  }
  const applySuggestedCombo = (slotIndex: number, c: Combo) => {
    const nv = Math.max(visibleCombos, slotIndex + 1)
    const next = [...combos]; next[slotIndex] = c; setCombos(next)
    if (nv !== visibleCombos) setVisibleCombos(nv)
    revalidate(next)
  }
  const applySwap = (ci: number, field: keyof Combo, val: string) => {
    const next = [...combos]; next[ci] = { ...next[ci], [field]: val }; setCombos(next); revalidate(next)
  }

  const analyzeCombos = async () => {
    setHasTriedAnalyze(true)
    const v = validateDeck({ combos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted: globalMeta.topCutCombosSorted })
    setValidation(v)
    if (v.status !== "ok") { window.scrollTo({ top: 0, behavior: "smooth" }); return }
    const valid = combos.slice(0, 3).filter(c => c.blade && c.ratchet && c.bit)
    if (valid.length !== 3) { alert("Please enter three full combos."); return }

    setLoadingAnalysis(true)
    try {
      const displayResults = buildResultsFromIndex(valid, comboIndex, false)
      setResults(displayResults)
      const gradeResults = buildResultsFromIndex(valid, comboIndex, true)
      const meta = { ...globalMeta, comboAppearancesAll: tlGlobalMeta.comboAppearancesAll }
      const dgD = computeDeckGrade({ results: displayResults, combos: valid, visibleCombos: 3, globalMeta: meta })
      const dgG = computeDeckGrade({ results: gradeResults, combos: valid, visibleCombos: 3, globalMeta: meta })
      if (dgD && dgG) {
        setDeckGrade({
          score: dgG.score, grade: dgG.grade, confidence: dgG.confidence,
          components: dgD.components, reasons: dgD.reasons, partsUniqueRatio: dgD.partsUniqueRatio,
        })
      } else setDeckGrade(null)
    } catch (e) { console.error(e); alert("Error analyzing combos") }
    finally { setLoadingAnalysis(false) }
  }

  /* ── Auth gates ── */
  if (authLoading) return (
    <div className="tl-root tl-center-screen">
      <span className="tl-spinner-lg" />
      <style>{TL_CSS}</style>
    </div>
  )

  if (!isAuthenticated) return (
    <div className="tl-root tl-center-screen">
      <div className="tl-lock-card">
        <div className="tl-lock-icon">&#x2B21;</div>
        <h2 className="tl-lock-title">Access Restricted</h2>
        <p className="tl-lock-body">Tournament Lab is available to registered players only.</p>
        <a href="/user-auth" className="tl-btn-primary">Sign In to Continue</a>
      </div>
      <style>{TL_CSS}</style>
    </div>
  )

  const gc = deckGrade ? GRADE_COLOR[deckGrade.grade] : "#fff"

  return (
    <div className="tl-root">
      <div className="tl-noise" />

      <div className="tl-wrap">

        {/* ── Header ── */}
        <header className="tl-header">
          <div>
            <p className="tl-eyebrow">Tournament Preparation</p>
            <h1 className="tl-page-title">Deck Lab</h1>
          </div>
          <Link to="/build-from-my-parts" className="tl-btn-ghost">
            Build from My Parts
          </Link>
        </header>

        {/* ── Previous prep ── */}
        {previousPrep && (
          <div className="tl-prev-card">
            <p className="tl-eyebrow" style={{ marginBottom: "8px" }}>Previous Submission</p>
            <div className="tl-prev-list">
              {previousPrep.combos.map((c: any, i: number) => (
                <span key={i} className="tl-prev-pill">
                  {c.blade} / {c.ratchet} / {c.bit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Validation banner ── */}
        {hasTriedAnalyze && validation && validation.status !== "ok" && (
          <div className={validation.status === "illegal" ? "tl-alert tl-alert-illegal" : "tl-alert tl-alert-incomplete"}>
            <div className="tl-alert-head">
              <span className="tl-alert-icon-badge">
                {validation.status === "illegal" ? "!" : "!"}
              </span>
              <span className="tl-alert-title">
                {validation.status === "illegal" ? "Illegal Deck" : "Incomplete Deck"}
              </span>
            </div>

            {validation.messages.map((m, i) => (
              <p key={i} className="tl-alert-msg">{m}</p>
            ))}

            {validation.recommendations.length > 0 && (
              <div className="tl-alert-sub">
                <p className="tl-eyebrow" style={{ marginBottom: "10px" }}>Recommended Completions</p>
                <div className="tl-rec-grid">
                  {validation.recommendations.map((c, i) => {
                    const slot = findNextEmptySlot(combos)
                    const target = slot !== -1 ? slot : Math.min(visibleCombos, 2)
                    const disabled = conflictsWithDeck(c, combos)
                    return (
                      <div key={i} className="tl-rec-card">
                        <div>
                          <p className="tl-eyebrow" style={{ marginBottom: "4px" }}>Option {i + 1}</p>
                          <p className="tl-rec-combo">{c.blade} / {c.ratchet} / {c.bit}</p>
                        </div>
                        <button
                          disabled={disabled}
                          className={disabled ? "tl-btn-muted" : "tl-btn-sm"}
                          onClick={() => !disabled && applySuggestedCombo(target, c)}
                          type="button"
                        >
                          {disabled ? "In Deck" : `Slot ${target + 1}`}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {validation.status === "illegal" && validation.swaps.length > 0 && (
              <div className="tl-alert-sub">
                <p className="tl-eyebrow" style={{ marginBottom: "10px" }}>Quick Fixes</p>
                <div className="tl-swap-list">
                  {validation.swaps.map((s, i) => (
                    <div key={i} className="tl-swap-row">
                      <span className="tl-swap-slot">C{s.comboIndex + 1}</span>
                      <span className="tl-swap-field">{capitalize(s.field)}</span>
                      <span className="tl-swap-from">{s.from}</span>
                      <span className="tl-swap-sep">&#8594;</span>
                      <span className="tl-swap-to">{s.to}</span>
                      <button className="tl-btn-fix" onClick={() => applySwap(s.comboIndex, s.field, s.to)} type="button">
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Combo slots ── */}
        <div className="tl-combos">
          {combos.slice(0, visibleCombos).map((combo, i) => {
            const done = !!(combo.blade && combo.ratchet && combo.bit)
            return (
              <div key={i} className={done ? "tl-combo-card tl-combo-done" : "tl-combo-card"}>
                <div className="tl-combo-top">
                  <div className="tl-combo-heading-group">
                    <span className={done ? "tl-combo-num tl-combo-num-done" : "tl-combo-num"}>
                      0{i + 1}
                    </span>
                    <span className="tl-combo-word">Combo</span>
                  </div>
                  <span className={done ? "tl-status-badge tl-badge-ready" : "tl-status-badge tl-badge-pending"}>
                    {done ? "Ready" : "Incomplete"}
                  </span>
                </div>

                <div className="tl-part-fields">
                  <PartInput label="Blade" value={combo.blade} options={blades} onChange={v => updateCombo(i, "blade", v)} />
                  <PartInput label="Ratchet" value={combo.ratchet} options={ratchets} onChange={v => updateCombo(i, "ratchet", v)} />
                  <PartInput label="Bit" value={combo.bit} options={bits} onChange={v => updateCombo(i, "bit", v)} />
                </div>

                {visibleCombos > 1 && i === visibleCombos - 1 && (
                  <button className="tl-remove-link" onClick={removeCombo} type="button">
                    Remove this slot
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Add slot ── */}
        {visibleCombos < 3 && (
          <button className="tl-add-slot" onClick={() => setVisibleCombos(v => v + 1)} type="button">
            <span className="tl-add-plus">+</span>
            <span>Add Combo Slot</span>
            <span className="tl-slot-count">{visibleCombos} / 3</span>
          </button>
        )}

        {/* ── Analyze ── */}
        <button className="tl-analyze-btn" onClick={analyzeCombos} disabled={loadingAnalysis} type="button">
          {loadingAnalysis
            ? <><span className="tl-btn-spin" />Analyzing Deck...</>
            : "Analyze Deck"}
        </button>

        {/* ── Deck Grade ── */}
        {deckGrade && (
          <div className="tl-grade-card">
            <div className="tl-grade-body">
              <p className="tl-eyebrow" style={{ marginBottom: "6px" }}>Deck Rating</p>
              <div className="tl-grade-score-row">
                <span className="tl-grade-score">{deckGrade.score}</span>
                <span className="tl-grade-max">/100</span>
              </div>
              <div className="tl-grade-chips">
                <span className="tl-chip">{deckGrade.confidence} confidence</span>
                <span className="tl-chip-plain">{(deckGrade.partsUniqueRatio * 100).toFixed(0)}% diversity</span>
              </div>

              <div className="tl-metrics">
                {(["strength", "recency", "diversity"] as const).map(k => {
                  const v = deckGrade.components[k]
                  const barColor = v >= 70 ? "#4ADE80" : v >= 40 ? "#FB923C" : "#F87171"
                  return (
                    <div key={k} className="tl-metric-row">
                      <span className="tl-metric-name">{k}</span>
                      <div className="tl-metric-track">
                        <div className="tl-metric-fill" style={{ width: `${v}%`, background: barColor }} />
                      </div>
                      <span className="tl-metric-val">{Math.round(v)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="tl-reasons">
                {deckGrade.reasons.slice(0, 3).map((r, i) => (
                  <span key={i} className="tl-reason-tag">{r}</span>
                ))}
              </div>
            </div>

            <div className="tl-grade-letter-wrap">
              <div className="tl-grade-letter-box" style={{ borderColor: gc }}>
                <span className="tl-grade-letter" style={{ color: gc }}>{deckGrade.grade}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Top cut stats ── */}
        {results.length > 0 && (
          <section ref={resultsRef} className="tl-stats-section">
            <p className="tl-eyebrow" style={{ marginBottom: "14px" }}>Top Cut Statistics</p>
            <div className="tl-stats-grid">
              {results.map((r, i) => (
                <div key={i} className="tl-stat-card">
                  <div className="tl-stat-idx">0{i + 1}</div>
                  <p className="tl-stat-combo-name">
                    {r.submittedCombo.blade}
                    <span className="tl-stat-sep"> / </span>
                    {r.submittedCombo.ratchet}
                    <span className="tl-stat-sep"> / </span>
                    {r.submittedCombo.bit}
                  </p>
                  <div className="tl-stat-nums">
                    <div className="tl-stat-num-blk">
                      <span className="tl-stat-big">{r.topCutAppearances}</span>
                      <span className="tl-stat-lbl">Top Cut</span>
                    </div>
                    <div className="tl-stat-num-blk">
                      <span className="tl-stat-big">{r.uniqueEvents}</span>
                      <span className="tl-stat-lbl">Events</span>
                    </div>
                  </div>
                  <div className="tl-stat-dates">
                    <div>
                      <span className="tl-stat-date-label">Latest</span>
                      <span className="tl-stat-date-val">{r.mostRecentAppearance ? formatDate(r.mostRecentAppearance) : "—"}</span>
                    </div>
                    <div>
                      <span className="tl-stat-date-label">First Seen</span>
                      <span className="tl-stat-date-val">{r.firstSeen ? formatDate(r.firstSeen) : "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{TL_CSS}</style>
    </div>
  )
}

/* ─────────────────────────────────────────
   All CSS in one template literal — no
   encoding issues, clean separation
───────────────────────────────────────── */
const TL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');

  .tl-root {
    min-height: 100vh;
    background: #0c0c0e;
    color: #e6e6e8;
    font-family: 'Syne', sans-serif;
    position: relative;
    overflow-x: hidden;
  }
  .tl-noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    opacity: 0.4;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  }
  .tl-center-screen {
    display: flex; align-items: center; justify-content: center;
  }
  .tl-wrap {
    position: relative; z-index: 1;
    max-width: 680px; margin: 0 auto;
    padding: 52px 20px 100px;
  }

  /* ── Typography ── */
  .tl-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
    color: #484858; margin: 0;
  }
  .tl-page-title {
    font-size: 44px; font-weight: 800; letter-spacing: -0.025em;
    line-height: 1; margin: 6px 0 0;
    color: #e6e6e8;
  }

  /* ── Header ── */
  .tl-header {
    display: flex; align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 40px; gap: 16px;
  }

  /* ── Buttons ── */
  .tl-btn-ghost {
    display: inline-flex; align-items: center;
    padding: 10px 18px;
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 8px;
    color: rgba(255,255,255,0.45);
    font-size: 13px; font-weight: 600;
    font-family: 'Syne', sans-serif;
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 0.18s, color 0.18s;
  }
  .tl-btn-ghost:hover {
    border-color: rgba(255,255,255,0.26);
    color: #e6e6e8;
  }
  .tl-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 13px 28px;
    background: #e6e6e8; border-radius: 8px;
    color: #0c0c0e; font-size: 14px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .tl-btn-primary:hover { opacity: 0.88; }

  .tl-btn-sm {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 8px 14px; white-space: nowrap; cursor: pointer;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px; color: #e6e6e8;
    font-size: 12px; font-weight: 600;
    font-family: 'Syne', sans-serif;
    transition: background 0.15s;
  }
  .tl-btn-sm:hover { background: rgba(255,255,255,0.13); }

  .tl-btn-muted {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 8px 14px; white-space: nowrap;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px; color: #303040;
    font-size: 12px; cursor: not-allowed;
    font-family: 'Syne', sans-serif;
  }

  .tl-btn-fix {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 6px 12px; white-space: nowrap; cursor: pointer;
    background: transparent;
    border: 1px solid rgba(96,165,250,0.35);
    border-radius: 5px; color: #93c5fd;
    font-size: 11px; font-weight: 600;
    font-family: 'Syne', sans-serif;
    transition: background 0.15s;
  }
  .tl-btn-fix:hover { background: rgba(96,165,250,0.1); }

  .tl-analyze-btn {
    width: 100%; padding: 17px 24px;
    background: #e6e6e8; border: none;
    border-radius: 10px; color: #0c0c0e;
    font-size: 15px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    letter-spacing: 0.01em; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-bottom: 32px;
    transition: opacity 0.15s, transform 0.12s;
  }
  .tl-analyze-btn:hover:not(:disabled) {
    opacity: 0.9; transform: translateY(-1px);
  }
  .tl-analyze-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .tl-remove-link {
    background: none; border: none;
    color: #3a1e1e; font-size: 11px; cursor: pointer;
    padding: 0; margin-top: 12px;
    font-family: 'DM Mono', monospace; letter-spacing: 0.06em;
    transition: color 0.15s;
  }
  .tl-remove-link:hover { color: #f87171; }

  /* ── Spinners ── */
  .tl-spinner-lg {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid rgba(230,230,232,0.12);
    border-top-color: #e6e6e8;
    animation: tl-spin 0.65s linear infinite;
    display: inline-block;
  }
  .tl-btn-spin {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(12,12,14,0.18);
    border-top-color: #0c0c0e;
    animation: tl-spin 0.65s linear infinite;
    display: inline-block; flex-shrink: 0;
  }
  @keyframes tl-spin { to { transform: rotate(360deg); } }
  @keyframes tl-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Lock screen ── */
  .tl-lock-card {
    text-align: center; padding: 52px 40px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    background: rgba(255,255,255,0.02);
    max-width: 360px;
  }
  .tl-lock-icon { font-size: 34px; opacity: 0.18; margin-bottom: 22px; }
  .tl-lock-title { font-size: 22px; font-weight: 800; margin: 0 0 10px; }
  .tl-lock-body { font-size: 14px; color: #484858; line-height: 1.65; margin: 0 0 26px; }

  /* ── Previous prep ── */
  .tl-prev-card {
    padding: 16px 20px; margin-bottom: 28px;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    background: rgba(255,255,255,0.02);
  }
  .tl-prev-list { display: flex; flex-direction: column; gap: 5px; }
  .tl-prev-pill {
    font-size: 12px; color: #404055;
    font-family: 'DM Mono', monospace;
  }

  /* ── Alert banner ── */
  .tl-alert {
    border-radius: 12px; padding: 20px 22px;
    margin-bottom: 28px;
    animation: tl-fade-up 0.2s ease;
  }
  .tl-alert-incomplete {
    border: 1px solid rgba(251,146,60,0.3);
    background: rgba(251,146,60,0.05);
  }
  .tl-alert-illegal {
    border: 1px solid rgba(248,113,113,0.3);
    background: rgba(248,113,113,0.05);
  }
  .tl-alert-head {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .tl-alert-icon-badge {
    width: 20px; height: 20px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0;
  }
  .tl-alert-incomplete .tl-alert-icon-badge {
    background: rgba(251,146,60,0.18); color: #fb923c;
  }
  .tl-alert-illegal .tl-alert-icon-badge {
    background: rgba(248,113,113,0.18); color: #f87171;
  }
  .tl-alert-title { font-size: 15px; font-weight: 700; }
  .tl-alert-incomplete .tl-alert-title { color: #fb923c; }
  .tl-alert-illegal .tl-alert-title { color: #f87171; }
  .tl-alert-msg {
    font-size: 13px; color: rgba(230,230,232,0.5);
    margin: 0 0 4px; line-height: 1.55;
  }
  .tl-alert-sub { margin-top: 18px; }

  .tl-rec-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .tl-rec-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px; padding: 12px 14px;
    display: flex; align-items: center;
    justify-content: space-between; gap: 12px;
  }
  .tl-rec-combo {
    font-size: 12px; font-weight: 600;
    color: rgba(230,230,232,0.75); margin: 0;
    line-height: 1.45;
  }

  .tl-swap-list { display: flex; flex-direction: column; gap: 6px; }
  .tl-swap-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; padding: 10px 14px;
  }
  .tl-swap-slot {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: #303040;
  }
  .tl-swap-field {
    font-family: 'DM Mono', monospace;
    font-size: 10px; color: #484858;
  }
  .tl-swap-from {
    font-size: 13px; color: rgba(248,113,113,0.6);
    text-decoration: line-through;
  }
  .tl-swap-sep { font-size: 13px; color: #303040; }
  .tl-swap-to { font-size: 13px; font-weight: 600; color: #4ade80; flex: 1; }

  /* ── Combo cards ── */
  .tl-combos { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
  .tl-combo-card {
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px; padding: 22px 22px 18px;
    background: rgba(255,255,255,0.025);
    transition: border-color 0.22s;
  }
  .tl-combo-done {
    border-color: rgba(74,222,128,0.25);
    background: rgba(74,222,128,0.025);
  }
  .tl-combo-top {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 18px;
  }
  .tl-combo-heading-group {
    display: flex; align-items: baseline; gap: 8px;
  }
  .tl-combo-num {
    font-size: 40px; font-weight: 800; line-height: 1;
    letter-spacing: -0.04em; color: rgba(255,255,255,0.12);
    transition: color 0.22s;
  }
  .tl-combo-num-done { color: rgba(74,222,128,0.55); }
  .tl-combo-word {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
    color: #303040;
  }
  .tl-status-badge {
    font-family: 'DM Mono', monospace;
    font-size: 10px; font-weight: 500;
    padding: 4px 10px; border-radius: 100px;
    letter-spacing: 0.06em;
  }
  .tl-badge-ready {
    background: rgba(74,222,128,0.1);
    color: #4ade80;
    border: 1px solid rgba(74,222,128,0.22);
  }
  .tl-badge-pending {
    background: rgba(255,255,255,0.04);
    color: #303040;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .tl-part-fields { display: flex; flex-direction: column; gap: 6px; }

  /* ── Part input ── */
  .tl-pinput-wrap { position: relative; }
  .tl-pinput-row {
    display: flex; align-items: stretch;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; background: rgba(0,0,0,0.28);
    overflow: hidden; transition: border-color 0.15s;
  }
  .tl-pinput-row:focus-within {
    border-color: rgba(255,255,255,0.22);
  }
  .tl-pinput-label {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: #404055; padding: 0 14px;
    display: flex; align-items: center;
    border-right: 1px solid rgba(255,255,255,0.06);
    white-space: nowrap; min-width: 72px;
    justify-content: center; user-select: none; flex-shrink: 0;
  }
  .tl-pinput-inner {
    flex: 1; position: relative; display: flex; align-items: center;
  }
  .tl-pinput {
    width: 100%; background: transparent; border: none; outline: none;
    color: #e6e6e8; font-size: 14px; font-weight: 500;
    padding: 12px 36px 12px 14px;
    font-family: 'Syne', sans-serif;
  }
  .tl-pinput::placeholder {
    color: rgba(255,255,255,0.14);
    font-size: 12px;
    font-family: 'DM Mono', monospace;
  }
  .tl-pinput-clear {
    position: absolute; right: 10px;
    background: none; border: none;
    color: rgba(255,255,255,0.22); font-size: 18px;
    cursor: pointer; line-height: 1; padding: 2px 4px;
    transition: color 0.15s;
  }
  .tl-pinput-clear:hover { color: rgba(255,255,255,0.55); }
  .tl-dropdown {
    position: absolute; z-index: 200;
    top: calc(100% + 4px); left: 0; right: 0;
    background: #16161e;
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 10px; list-style: none;
    margin: 0; padding: 4px 0;
    max-height: 210px; overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0,0,0,0.75);
  }
  .tl-dropdown-item {
    padding: 10px 16px; cursor: pointer;
    font-size: 13px; font-weight: 500;
    color: rgba(230,230,232,0.7);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.1s, color 0.1s;
    font-family: 'Syne', sans-serif;
  }
  .tl-dropdown-item:last-child { border-bottom: none; }
  .tl-dropdown-item:hover {
    background: rgba(255,255,255,0.07); color: #e6e6e8;
  }
  .tl-match { background: none; color: #4ade80; font-weight: 700; }

  /* ── Add slot ── */
  .tl-add-slot {
    width: 100%; padding: 15px 20px; margin-bottom: 16px;
    background: transparent;
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 10px;
    color: rgba(255,255,255,0.28);
    font-size: 13px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-family: 'Syne', sans-serif;
    transition: border-color 0.18s, color 0.18s;
  }
  .tl-add-slot:hover {
    border-color: rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.55);
  }
  .tl-add-plus { font-size: 18px; font-weight: 300; line-height: 1; }
  .tl-slot-count {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em;
    color: #303040; margin-left: auto;
  }

  /* ── Grade card ── */
  .tl-grade-card {
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 28px;
    background: rgba(255,255,255,0.025);
    display: flex; gap: 24px; margin-bottom: 30px;
    animation: tl-fade-up 0.25s ease;
  }
  .tl-grade-body { flex: 1; }
  .tl-grade-letter-wrap {
    display: flex; align-items: flex-start; padding-top: 4px;
  }
  .tl-grade-score-row {
    display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px;
  }
  .tl-grade-score {
    font-size: 66px; font-weight: 800; line-height: 1;
    letter-spacing: -0.04em; color: #e6e6e8;
  }
  .tl-grade-max {
    font-size: 20px; color: #303040; font-weight: 400;
  }
  .tl-grade-chips {
    display: flex; gap: 10px; align-items: center; margin-bottom: 22px;
  }
  .tl-chip {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em;
    padding: 4px 10px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px; color: rgba(230,230,232,0.38);
  }
  .tl-chip-plain {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.1em; color: #303040;
  }
  .tl-metrics { display: flex; flex-direction: column; gap: 11px; margin-bottom: 18px; }
  .tl-metric-row { display: flex; align-items: center; gap: 12px; }
  .tl-metric-name {
    font-family: 'DM Mono', monospace;
    font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase;
    color: #404055; width: 58px;
  }
  .tl-metric-track {
    flex: 1; height: 3px; background: rgba(255,255,255,0.07);
    border-radius: 2px; overflow: hidden;
  }
  .tl-metric-fill {
    height: 100%; border-radius: 2px;
    transition: width 0.5s ease;
  }
  .tl-metric-val {
    font-family: 'DM Mono', monospace;
    font-size: 13px; font-weight: 500; width: 28px; text-align: right;
  }
  .tl-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
  .tl-reason-tag {
    font-size: 11px; padding: 5px 12px; border-radius: 100px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(230,230,232,0.45); font-weight: 500;
  }
  .tl-grade-letter-box {
    width: 88px; height: 88px; border-radius: 14px; border: 2px solid;
    display: flex; align-items: center; justify-content: center;
  }
  .tl-grade-letter {
    font-size: 58px; font-weight: 800; line-height: 1; letter-spacing: -0.04em;
  }

  /* ── Stats ── */
  .tl-stats-section { animation: tl-fade-up 0.25s ease; }
  .tl-stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .tl-stat-card {
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 18px 16px;
    background: rgba(255,255,255,0.02);
  }
  .tl-stat-idx {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em;
    color: #252530; margin-bottom: 8px;
  }
  .tl-stat-combo-name {
    font-size: 12px; font-weight: 600;
    color: rgba(230,230,232,0.6); margin: 0 0 14px;
    line-height: 1.55;
  }
  .tl-stat-sep { color: #252530; }
  .tl-stat-nums { display: flex; gap: 18px; margin-bottom: 14px; }
  .tl-stat-num-blk { display: flex; flex-direction: column; gap: 3px; }
  .tl-stat-big {
    font-size: 34px; font-weight: 800; line-height: 1;
    letter-spacing: -0.02em; color: #e6e6e8;
  }
  .tl-stat-lbl {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: #303040;
  }
  .tl-stat-dates { display: flex; gap: 14px; }
  .tl-stat-date-label {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #252530; margin-bottom: 3px;
  }
  .tl-stat-date-val {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: #404055;
  }

  /* ── Responsive ── */
  @media (max-width: 540px) {
    .tl-stats-grid { grid-template-columns: 1fr; }
    .tl-rec-grid { grid-template-columns: 1fr; }
    .tl-grade-card { flex-direction: column; }
    .tl-grade-letter-wrap { justify-content: flex-start; }
    .tl-page-title { font-size: 34px; }
  }
`
