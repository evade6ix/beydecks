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

  const [blades, setBlades] = useState<string[]>([])
  const [ratchets, setRatchets] = useState<string[]>([])
  const [bits, setBits] = useState<string[]>([])
  const [bladeFreq, setBladeFreq] = useState<Record<string, number>>({})
  const [ratchetFreq, setRatchetFreq] = useState<Record<string, number>>({})
  const [bitFreq, setBitFreq] = useState<Record<string, number>>({})

  const [globalMeta, setGlobalMeta] = useState<GlobalMeta>({
    topCutCombosSorted: [],
    comboAppearancesAll: [],
  })

  const [comboIndex, setComboIndex] = useState<Record<string, {
    appearances: number
    uniqueEvents: Set<string>
    mostRecent?: string
    firstSeen?: string
  }>>({})

  const [tlGlobalMeta, setTlGlobalMeta] = useState<{ comboAppearancesAll: number[] }>({
    comboAppearancesAll: [],
  })

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [deckGrade, setDeckGrade] = useState<DeckGrade | null>(null)
  const [hasTriedAnalyze, setHasTriedAnalyze] = useState(false)

  const resultsRef = useRef<HTMLDivElement | null>(null)

  function buildResultsFromIndex(
    combos: Combo[],
    index: Record<string, { appearances: number; uniqueEvents: Set<string>; mostRecent?: string; firstSeen?: string }>,
    includeSelf: boolean
  ) {
    const nowIso = new Date().toISOString()
    return combos.map(c => {
      const k = tlKey(c)
      const rec = index[k]
      let appearances = rec?.appearances ?? 0
      let uniqueEvents = rec?.uniqueEvents?.size ?? 0
      let mostRecent = rec?.mostRecent
      let firstSeen = rec?.firstSeen

      if (includeSelf) {
        appearances += 1
        uniqueEvents += 1
        mostRecent = nowIso
        if (!firstSeen) firstSeen = nowIso
      }

      return {
        submittedCombo: c,
        topCutAppearances: appearances,
        uniqueEvents,
        mostRecentAppearance: mostRecent,
        firstSeen,
      }
    })
  }

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/prep-decks/user/${user.id}`)
      .then(res => res.json())
      .then(data => { if (data && data.combos) setPreviousPrep(data) })
      .catch(() => null)
  }, [user])

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
              if (combo.blade) { bladeSet.add(combo.blade); bFreq[combo.blade] = (bFreq[combo.blade] || 0) + 1 }
              if (combo.ratchet) { ratchetSet.add(combo.ratchet); rFreq[combo.ratchet] = (rFreq[combo.ratchet] || 0) + 1 }
              if (combo.bit) { bitSet.add(combo.bit); btFreq[combo.bit] = (btFreq[combo.bit] || 0) + 1 }
              if (combo.blade && combo.ratchet && combo.bit) {
                const key = comboKey(combo)
                comboFreq[key] = (comboFreq[key] || 0) + 1
              }
            })
          })
        })

        const sortByFreq = (arr: string[], map: Record<string, number>) =>
          [...arr].sort((a, b) => (map[b] || 0) - (map[a] || 0))

        setBlades(sortByFreq([...bladeSet], bFreq))
        setRatchets(sortByFreq([...ratchetSet], rFreq))
        setBits(sortByFreq([...bitSet], btFreq))
        setBladeFreq(bFreq)
        setRatchetFreq(rFreq)
        setBitFreq(btFreq)

        const topCutCombosSorted: Combo[] = Object.entries(comboFreq)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => parseComboKey(k))
        const comboAppearancesAll = Object.values(comboFreq)
        setGlobalMeta({ topCutCombosSorted, comboAppearancesAll })

        const idx: Record<string, { appearances: number; uniqueEvents: Set<string>; mostRecent?: string; firstSeen?: string }> = {}
        const appCounts: number[] = []

        for (const ev of data) {
          const evId = String(ev.id)
          const evDate = ev.endTime || ev.startTime
          ev?.topCut?.forEach((p: any) => {
            p?.combos?.forEach((c: any) => {
              if (!c?.blade || !c?.ratchet || !c?.bit) return
              const key = tlKey({ blade: c.blade, ratchet: c.ratchet, bit: c.bit })
              if (!idx[key]) idx[key] = { appearances: 0, uniqueEvents: new Set<string>() }
              idx[key].appearances += 1
              idx[key].uniqueEvents.add(evId)
              if (evDate) {
                if (!idx[key].mostRecent || new Date(evDate) > new Date(idx[key].mostRecent!)) idx[key].mostRecent = evDate
                if (!idx[key].firstSeen || new Date(evDate) < new Date(idx[key].firstSeen!)) idx[key].firstSeen = evDate
              }
            })
          })
        }

        for (const k of Object.keys(idx)) appCounts.push(idx[k].appearances)
        setComboIndex(idx)
        setTlGlobalMeta({ comboAppearancesAll: appCounts })
      })
      .catch(err => console.error("Failed to load parts", err))
  }, [])

  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [results])

  const revalidate = (nextCombos: Combo[]) => {
    setValidation(validateDeck({ combos: nextCombos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted: globalMeta.topCutCombosSorted }))
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

  const applySwap = (comboIdx: number, field: keyof Combo, value: string) => {
    const next = [...combos]
    next[comboIdx] = { ...next[comboIdx], [field]: value }
    setCombos(next)
    revalidate(next)
  }

  const analyzeCombos = async () => {
    setHasTriedAnalyze(true)
    const v = validateDeck({ combos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted: globalMeta.topCutCombosSorted })
    setValidation(v)

    if (v.status !== "ok") { window.scrollTo({ top: 0, behavior: "smooth" }); return }

    const validCombos = combos.slice(0, 3).filter(c => c.blade && c.ratchet && c.bit)
    if (validCombos.length !== 3) { alert("Please enter three full combos."); return }

    setLoadingAnalysis(true)
    try {
      const displayResults = buildResultsFromIndex(validCombos, comboIndex, false)
      setResults(displayResults)
      const gradeResults = buildResultsFromIndex(validCombos, comboIndex, true)
      const commonMeta = { ...globalMeta, comboAppearancesAll: tlGlobalMeta.comboAppearancesAll }
      const dgForDisplay = computeDeckGrade({ results: displayResults, combos: validCombos, visibleCombos: 3, globalMeta: commonMeta })
      const dgForGrade = computeDeckGrade({ results: gradeResults, combos: validCombos, visibleCombos: 3, globalMeta: commonMeta })

      if (dgForDisplay && dgForGrade) {
        setDeckGrade({
          score: dgForGrade.score,
          grade: dgForGrade.grade,
          confidence: dgForGrade.confidence,
          components: dgForDisplay.components,
          reasons: dgForDisplay.reasons,
          partsUniqueRatio: dgForDisplay.partsUniqueRatio,
        })
      } else {
        setDeckGrade(null)
      }
    } catch (err) {
      console.error(err)
      alert("Error analyzing combos")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  if (authLoading) {
    return (
      <div style={styles.lockScreen}>
        <div style={styles.loadingDot} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.lockScreen}>
        <div style={styles.lockCard}>
          <div style={styles.lockIcon}>â¬¡</div>
          <h1 style={styles.lockTitle}>ACCESS RESTRICTED</h1>
          <p style={styles.lockSub}>Tournament Lab requires authentication to access deck analysis tools.</p>
          <a href="/user-auth" style={styles.lockBtn}>AUTHENTICATE â†’</a>
        </div>
      </div>
    )
  }

  const gradeColors: Record<string, string> = { S: "#FFD700", A: "#00E5A0", B: "#4FC3F7", C: "#FF9F43", D: "#FF6B6B" }
  const gradeColor = deckGrade ? (gradeColors[deckGrade.grade] || "#fff") : "#fff"

  return (
    <div style={styles.root}>
      {/* Subtle grid background */}
      <div style={styles.gridBg} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerLabel}>TOURNAMENT LAB</div>
            <h1 style={styles.headerTitle}>DECK BUILDER</h1>
          </div>
          <div style={styles.headerRight}>
            <Link to="/build-from-my-parts" style={styles.ghostBtn}>
              MY PARTS â†’
            </Link>
          </div>
        </div>

        <div style={styles.subheading}>Configure exactly 3 unique combos for tournament submission.</div>

        {/* Previous Prep Banner */}
        {previousPrep && (
          <div style={styles.prevPrepCard}>
            <div style={styles.prevPrepLabel}>PREVIOUS SUBMISSION</div>
            <div style={styles.prevPrepCombos}>
              {previousPrep.combos.map((c: any, i: number) => (
                <span key={i} style={styles.prevPrepCombo}>
                  {c.blade} / {c.ratchet} / {c.bit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Validation Banner */}
        {hasTriedAnalyze && validation && validation.status !== "ok" && (
          <div style={{
            ...styles.validationBanner,
            borderColor: validation.status === "illegal" ? "#FF6B6B" : "#FF9F43",
            background: validation.status === "illegal" ? "rgba(255,107,107,0.06)" : "rgba(255,159,67,0.06)",
          }}>
            <div style={styles.validationHeader}>
              <span style={{ color: validation.status === "illegal" ? "#FF6B6B" : "#FF9F43", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em" }}>
                {validation.status === "illegal" ? "âœ• ILLEGAL DECK â€” DUPLICATE PARTS DETECTED" : "âš  INCOMPLETE DECK"}
              </span>
            </div>
            <div style={styles.validationMessages}>
              {validation.messages.map((m, i) => (
                <div key={i} style={styles.validationMsg}>{m}</div>
              ))}
            </div>

            {validation.recommendations.length > 0 && (
              <div style={styles.recSection}>
                <div style={styles.recLabel}>RECOMMENDED COMPLETIONS</div>
                <div style={styles.recGrid}>
                  {validation.recommendations.map((c, idx) => {
                    const slot = findNextEmptySlot(combos)
                    const targetIndex = slot !== -1 ? slot : Math.min(visibleCombos, 2)
                    const disabled = conflictsWithDeck(c, combos)
                    return (
                      <div key={idx} style={styles.recCard}>
                        <div>
                          <div style={styles.recCardLabel}>SUGGESTION {idx + 1}</div>
                          <div style={styles.recCardCombo}>{c.blade} / {c.ratchet} / {c.bit}</div>
                        </div>
                        <button
                          disabled={disabled}
                          style={{ ...styles.recApplyBtn, opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                          onClick={() => applySuggestedCombo(targetIndex, c)}
                        >
                          {disabled ? "IN DECK" : `â†’ SLOT ${targetIndex + 1}`}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {validation.status === "illegal" && validation.swaps.length > 0 && (
              <div style={styles.recSection}>
                <div style={styles.recLabel}>QUICK FIXES</div>
                <div style={styles.swapList}>
                  {validation.swaps.map((s, idx) => (
                    <div key={idx} style={styles.swapRow}>
                      <div style={styles.swapText}>
                        <span style={styles.swapSlot}>COMBO {s.comboIndex + 1}</span>
                        <span style={styles.swapField}>{capitalize(s.field)}</span>
                        <span style={styles.swapFrom}>{s.from}</span>
                        <span style={styles.swapArrow}>â†’</span>
                        <span style={styles.swapTo}>{s.to}</span>
                      </div>
                      <button style={styles.swapBtn} onClick={() => applySwap(s.comboIndex, s.field, s.to)}>
                        REPLACE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Combo Slots */}
        <div style={styles.comboGrid}>
          {combos.slice(0, visibleCombos).map((combo, i) => {
            const isComplete = !!(combo.blade && combo.ratchet && combo.bit)
            return (
              <div key={i} style={{ ...styles.comboCard, borderColor: isComplete ? "rgba(0,229,160,0.35)" : "rgba(255,255,255,0.1)" }}>
                <div style={styles.comboCardHeader}>
                  <div style={styles.comboNumber}>
                    <span style={{ ...styles.comboNumberText, color: isComplete ? "#00E5A0" : "rgba(255,255,255,0.3)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={styles.comboLabel}>COMBO</span>
                  </div>
                  {isComplete && <div style={styles.comboCheckmark}>âœ“</div>}
                  {!isComplete && <div style={styles.comboIncomplete}>INCOMPLETE</div>}
                </div>

                <div style={styles.comboFields}>
                  <AutoCompleteInput label="BLADE" value={combo.blade} options={blades} onChange={(val) => updateCombo(i, "blade", val)} />
                  <AutoCompleteInput label="RATCHET" value={combo.ratchet} options={ratchets} onChange={(val) => updateCombo(i, "ratchet", val)} />
                  <AutoCompleteInput label="BIT" value={combo.bit} options={bits} onChange={(val) => updateCombo(i, "bit", val)} />
                </div>

                {visibleCombos > 1 && i === visibleCombos - 1 && (
                  <button onClick={removeCombo} style={styles.removeBtn}>âˆ’ REMOVE SLOT</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Slot Controls */}
        <div style={styles.slotControls}>
          {visibleCombos < 3 && (
            <button onClick={() => setVisibleCombos(visibleCombos + 1)} style={styles.addSlotBtn}>
              + ADD COMBO SLOT
            </button>
          )}
          <div style={styles.slotCounter}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ ...styles.slotDot, background: n <= visibleCombos ? "#00E5A0" : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyzeCombos}
          disabled={loadingAnalysis}
          style={{ ...styles.analyzeBtn, opacity: loadingAnalysis ? 0.7 : 1 }}
        >
          {loadingAnalysis ? (
            <span style={styles.analyzeBtnInner}>
              <span style={styles.analyzeSpinner} />
              ANALYZING...
            </span>
          ) : (
            <span style={styles.analyzeBtnInner}>
              <span>RUN ANALYSIS</span>
              <span style={styles.analyzeBtnArrow}>â†’</span>
            </span>
          )}
        </button>

        {/* Deck Grade */}
        {deckGrade && (
          <div style={styles.gradeCard}>
            <div style={styles.gradeCardTop}>
              <div style={styles.gradeLeft}>
                <div style={styles.gradeHeading}>DECK ANALYSIS</div>
                <div style={styles.gradeScore}>
                  <span style={styles.gradeScoreNum}>{deckGrade.score}</span>
                  <span style={styles.gradeScoreMax}>/100</span>
                </div>
                <div style={styles.gradeMeta}>
                  <span style={styles.gradeConfBadge}>{deckGrade.confidence.toUpperCase()} CONFIDENCE</span>
                  <span style={styles.gradeParts}>{(deckGrade.partsUniqueRatio * 100).toFixed(0)}% PART DIVERSITY</span>
                </div>
              </div>
              <div style={{ ...styles.gradeLetterBox, borderColor: gradeColor }}>
                <span style={{ ...styles.gradeLetter, color: gradeColor }}>{deckGrade.grade}</span>
              </div>
            </div>

            <div style={styles.gradeMetrics}>
              {[
                { key: "strength", label: "STR" },
                { key: "recency", label: "REC" },
                { key: "diversity", label: "DIV" },
              ].map(({ key, label }) => {
                const val = deckGrade.components[key as keyof typeof deckGrade.components]
                return (
                  <div key={key} style={styles.metricBlock}>
                    <div style={styles.metricLabel}>{label}</div>
                    <div style={styles.metricBarTrack}>
                      <div style={{ ...styles.metricBarFill, width: `${val}%`, background: val >= 70 ? "#00E5A0" : val >= 40 ? "#FF9F43" : "#FF6B6B" }} />
                    </div>
                    <div style={styles.metricVal}>{Math.round(val)}</div>
                  </div>
                )
              })}
            </div>

            <div style={styles.gradeReasons}>
              {deckGrade.reasons.slice(0, 3).map((r, i) => (
                <div key={i} style={styles.gradeReasonTag}>
                  <span style={styles.gradeReasonDot} />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {results.length > 0 && (
          <div ref={resultsRef} style={styles.statsSection}>
            <div style={styles.statsSectionHeader}>
              <span style={styles.statsSectionLabel}>TOP CUT STATISTICS</span>
              <span style={styles.statsSectionSub}>GLOBAL DATABASE</span>
            </div>
            <div style={styles.statsGrid}>
              {results.map((r, i) => (
                <div key={i} style={styles.statsCard}>
                  <div style={styles.statsCardNum}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={styles.statsCardCombo}>
                    <span style={styles.statsComboTag}>{r.submittedCombo.blade}</span>
                    <span style={styles.statsSlash}>/</span>
                    <span style={styles.statsComboTag}>{r.submittedCombo.ratchet}</span>
                    <span style={styles.statsSlash}>/</span>
                    <span style={styles.statsComboTag}>{r.submittedCombo.bit}</span>
                  </div>
                  <div style={styles.statsRow}>
                    <StatCell label="TOP CUT" value={r.topCutAppearances} accent="#00E5A0" />
                    <StatCell label="EVENTS" value={r.uniqueEvents} accent="#4FC3F7" />
                  </div>
                  <div style={styles.statsRow}>
                    <div style={styles.statsMeta}>
                      <span style={styles.statsMetaLabel}>LATEST</span>
                      <span style={styles.statsMetaVal}>{r.mostRecentAppearance ? formatDate(r.mostRecentAppearance) : "â€”"}</span>
                    </div>
                    <div style={styles.statsMeta}>
                      <span style={styles.statsMetaLabel}>FIRST</span>
                      <span style={styles.statsMetaVal}>{r.firstSeen ? formatDate(r.firstSeen) : "â€”"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(0,229,160,0.25); }
        input::placeholder { color: rgba(255,255,255,0.2); font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.1em; }
        input:focus { outline: none; }
        button { font-family: 'Space Mono', monospace; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

function StatCell({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

/* =======================================
   AutoComplete Input
======================================= */
function AutoCompleteInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (val: string) => void }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = options.filter(opt => value && opt.toLowerCase().includes(value.toLowerCase()))
  const isSet = !!value

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{
          position: "absolute", left: 12, fontSize: 9,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.14em",
          color: isSet ? "#00E5A0" : "rgba(255,255,255,0.3)",
          pointerEvents: "none", whiteSpace: "nowrap",
          transition: "color 0.15s",
        }}>{label}</span>
        <input
          ref={inputRef}
          type="text"
          style={{
            width: "100%", padding: "10px 12px 10px 70px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${isSet ? "rgba(0,229,160,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 4, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 500, fontSize: 15, letterSpacing: "0.04em",
            transition: "border-color 0.15s, background 0.15s",
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
          placeholder={`Search ${label.toLowerCase()}...`}
        />
        {isSet && (
          <button
            onClick={() => onChange("")}
            style={{ position: "absolute", right: 10, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1 }}
          >âœ•</button>
        )}
      </div>
      {showDropdown && matches.length > 0 && (
        <div style={{
          position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#111", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, maxHeight: 200, overflowY: "auto",
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
        }}>
          {matches.map((opt, idx) => (
            <div
              key={idx}
              style={{
                padding: "9px 14px", cursor: "pointer", fontSize: 13,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
                letterSpacing: "0.03em", color: "rgba(255,255,255,0.85)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                transition: "background 0.1s",
              }}
              onMouseDown={() => { onChange(opt); setShowDropdown(false) }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,160,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {highlightMatch(opt, value)}
            </div>
          ))}
        </div>
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
      <strong style={{ color: "#00E5A0" }}>{text.slice(i, i + input.length)}</strong>
      {text.slice(i + input.length)}
    </>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
  } catch {
    return "â€”"
  }
}

/* =======================================
   Styles
======================================= */
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh", background: "#0A0A0A", color: "#fff", position: "relative",
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  gridBg: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  },
  container: { position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" },

  // Header
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 },
  headerLeft: {},
  headerLabel: { fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginBottom: 4 },
  headerTitle: { fontSize: 40, fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1, margin: 0 },
  headerRight: {},
  ghostBtn: {
    display: "inline-block", padding: "8px 16px",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4,
    color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.1em", textDecoration: "none", transition: "all 0.15s",
  },
  subheading: { fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 28, fontWeight: 400 },

  // Previous prep
  prevPrepCard: {
    marginBottom: 24, padding: "14px 18px",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
  },
  prevPrepLabel: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", marginBottom: 8 },
  prevPrepCombos: { display: "flex", flexDirection: "column", gap: 4 },
  prevPrepCombo: { fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em" },

  // Validation
  validationBanner: {
    marginBottom: 24, padding: "18px 20px",
    background: "rgba(255,107,107,0.06)", border: "1px solid",
    borderRadius: 6, animation: "fadeUp 0.2s ease",
  },
  validationHeader: { marginBottom: 10 },
  validationMessages: { display: "flex", flexDirection: "column", gap: 4 },
  validationMsg: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 400 },
  recSection: { marginTop: 16 },
  recLabel: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", marginBottom: 10 },
  recGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  recCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 5, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
  },
  recCardLabel: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: 4 },
  recCardCombo: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "0.02em" },
  recApplyBtn: {
    padding: "7px 12px", background: "rgba(0,229,160,0.12)",
    border: "1px solid rgba(0,229,160,0.3)", borderRadius: 4,
    color: "#00E5A0", fontSize: 10, letterSpacing: "0.1em", whiteSpace: "nowrap",
    cursor: "pointer",
  },
  swapList: { display: "flex", flexDirection: "column", gap: 6 },
  swapRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 5, padding: "10px 14px",
  },
  swapText: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  swapSlot: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)" },
  swapField: { fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" },
  swapFrom: { fontSize: 13, fontWeight: 500, color: "rgba(255,107,107,0.7)", textDecoration: "line-through" },
  swapArrow: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  swapTo: { fontSize: 13, fontWeight: 600, color: "#00E5A0" },
  swapBtn: {
    padding: "6px 12px", background: "transparent",
    border: "1px solid rgba(79,195,247,0.4)", borderRadius: 4,
    color: "#4FC3F7", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", whiteSpace: "nowrap" as const,
  },

  // Combos
  comboGrid: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 },
  comboCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid",
    borderRadius: 8, padding: "20px 20px 16px", transition: "border-color 0.2s",
  },
  comboCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  comboNumber: { display: "flex", alignItems: "baseline", gap: 8 },
  comboNumberText: { fontSize: 32, fontWeight: 900, lineHeight: 1, transition: "color 0.2s" },
  comboLabel: { fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)" },
  comboCheckmark: { fontSize: 13, color: "#00E5A0", fontFamily: "'Space Mono', monospace" },
  comboIncomplete: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" },
  comboFields: { display: "flex", flexDirection: "column", gap: 8 },
  removeBtn: {
    marginTop: 12, background: "none", border: "none", color: "rgba(255,107,107,0.5)",
    fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em",
    cursor: "pointer", padding: 0,
  },

  // Slot controls
  slotControls: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  addSlotBtn: {
    background: "none", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 4,
    color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.12em", padding: "8px 16px", cursor: "pointer",
  },
  slotCounter: { display: "flex", gap: 6, alignItems: "center" },
  slotDot: { width: 6, height: 6, borderRadius: "50%", transition: "background 0.2s" },

  // Analyze button
  analyzeBtn: {
    width: "100%", padding: "18px 24px",
    background: "#00E5A0", border: "none", borderRadius: 6,
    color: "#0A0A0A", fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.12em", cursor: "pointer", marginBottom: 32,
    transition: "opacity 0.15s, transform 0.1s",
  },
  analyzeBtnInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  analyzeBtnArrow: { fontSize: 18 },
  analyzeSpinner: {
    width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)",
    borderTopColor: "#0A0A0A", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },

  // Deck grade
  gradeCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "24px", marginBottom: 24,
    animation: "fadeUp 0.25s ease",
  },
  gradeCardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  gradeLeft: {},
  gradeHeading: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginBottom: 8 },
  gradeScore: { display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 },
  gradeScoreNum: { fontSize: 56, fontWeight: 900, lineHeight: 1 },
  gradeScoreMax: { fontSize: 18, color: "rgba(255,255,255,0.3)", fontWeight: 400 },
  gradeMeta: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  gradeConfBadge: {
    fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.14em",
    padding: "4px 8px", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3,
    color: "rgba(255,255,255,0.5)",
  },
  gradeParts: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)", lineHeight: "24px" },
  gradeLetterBox: {
    width: 80, height: 80, border: "2px solid",
    borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  gradeLetter: { fontSize: 52, fontWeight: 900, lineHeight: 1 },
  gradeMetrics: { display: "flex", gap: 16, marginBottom: 16 },
  metricBlock: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  metricLabel: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)" },
  metricBarTrack: { height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  metricBarFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },
  metricVal: { fontSize: 20, fontWeight: 800, lineHeight: 1 },
  gradeReasons: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  gradeReasonTag: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 12px", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
    fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)",
  },
  gradeReasonDot: { width: 4, height: 4, borderRadius: "50%", background: "#00E5A0", flexShrink: 0 },

  // Stats
  statsSection: { animation: "fadeUp 0.25s ease" },
  statsSectionHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 },
  statsSectionLabel: { fontSize: 16, fontWeight: 700, letterSpacing: "0.06em" },
  statsSectionSub: { fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  statsCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, padding: "16px",
  },
  statsCardNum: { fontSize: 11, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.2)", marginBottom: 10, letterSpacing: "0.1em" },
  statsCardCombo: { display: "flex", flexWrap: "wrap" as const, gap: 4, alignItems: "center", marginBottom: 14 },
  statsComboTag: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1.3 },
  statsSlash: { fontSize: 11, color: "rgba(255,255,255,0.2)" },
  statsRow: { display: "flex", gap: 10, marginBottom: 10 },
  statsMeta: { flex: 1 },
  statsMetaLabel: { display: "block", fontSize: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 3 },
  statsMetaVal: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono', monospace" },

  // Lock screen
  lockScreen: {
    minHeight: "100vh", background: "#0A0A0A", display: "flex",
    alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif",
  },
  lockCard: {
    textAlign: "center", maxWidth: 360, padding: 40,
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  },
  lockIcon: { fontSize: 40, marginBottom: 20, opacity: 0.3 },
  lockTitle: { fontSize: 24, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 12 },
  lockSub: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.5 },
  lockBtn: {
    display: "inline-block", padding: "12px 24px",
    background: "#00E5A0", borderRadius: 5,
    color: "#0A0A0A", fontSize: 12, fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.12em", textDecoration: "none", fontWeight: 700,
  },
  loadingDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#00E5A0",
    animation: "pulse 1s ease infinite",
  },
}

/* =======================================
   Validation / Suggestions
======================================= */
function normalize(s: string) { return (s || "").trim().toLowerCase().replace(/\s+/g, " ") }
function comboKey(c: Combo) { return `${normalize(c.blade)}|${normalize(c.ratchet)}|${normalize(c.bit)}` }
const tlKey = comboKey
function parseComboKey(key: string): Combo { const [blade, ratchet, bit] = key.split("|"); return { blade, ratchet, bit } }
function findNextEmptySlot(combos: Combo[]) { for (let i = 0; i < 3; i++) { const c = combos[i]; if (!c) return i; if (!c.blade || !c.ratchet || !c.bit) return i } return -1 }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function uniquePartsByCategory(slice: Combo[]) {
  const blades = new Set<string>(); const ratchets = new Set<string>(); const bits = new Set<string>()
  slice.forEach(c => { if (c.blade) blades.add(normalize(c.blade)); if (c.ratchet) ratchets.add(normalize(c.ratchet)); if (c.bit) bits.add(normalize(c.bit)) })
  return { blades, ratchets, bits }
}

function duplicatesByCategory(slice: Combo[]) {
  const count = (arr: string[]) => { const map: Record<string, number> = {}; arr.forEach(v => { map[normalize(v)] = (map[normalize(v)] || 0) + 1 }); return Object.entries(map).filter(([, n]) => n > 1).map(([k]) => k) }
  const blades: string[] = []; const ratchets: string[] = []; const bits: string[] = []
  slice.forEach(c => { if (c.blade) blades.push(c.blade); if (c.ratchet) ratchets.push(c.ratchet); if (c.bit) bits.push(c.bit) })
  return { blades: count(blades), ratchets: count(ratchets), bits: count(bits) }
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
    const b = normalize(cand.blade); const r = normalize(cand.ratchet); const bt = normalize(cand.bit)
    if (used.blades.has(b) || used.ratchets.has(r) || used.bits.has(bt)) continue
    recs.push(cand)
    used.blades.add(b); used.ratchets.add(r); used.bits.add(bt)
  }
  return recs
}

function proposeSwapsForDuplicates(params: { combos: Combo[]; dupes: { blades: string[]; ratchets: string[]; bits: string[] }; topBlades: string[]; topRatchets: string[]; topBits: string[] }) {
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

function validateDeck(args: { combos: Combo[]; visibleCombos: number; blades: string[]; ratchets: string[]; bits: string[]; bladeFreq: Record<string, number>; ratchetFreq: Record<string, number>; bitFreq: Record<string, number>; topCutCombosSorted: Combo[] }): ValidationResult {
  const { combos, visibleCombos, blades, ratchets, bits, bladeFreq, ratchetFreq, bitFreq, topCutCombosSorted } = args
  const full = combos.slice(0, 3).map(c => Boolean(c.blade && c.ratchet && c.bit))
  const fullCount = full.filter(Boolean).length
  const messages: string[] = []
  let status: ValidationResult["status"] = "ok"

  if (fullCount < 3) {
    status = "incomplete"
    const missing = 3 - fullCount
    messages.push(`You have ${fullCount}/3 complete combos. Add ${missing} more unique combo${missing > 1 ? "s" : ""}.`)
  }

  const dupes = duplicatesByCategory(combos.slice(0, 3))
  const hasDupes = dupes.blades.length + dupes.ratchets.length + dupes.bits.length > 0
  if (hasDupes) {
    status = "illegal"
    const list: string[] = []
    if (dupes.blades.length) list.push(`Blades: ${dupes.blades.join(", ")}`)
    if (dupes.ratchets.length) list.push(`Ratchets: ${dupes.ratchets.join(", ")}`)
    if (dupes.bits.length) list.push(`Bits: ${dupes.bits.join(", ")}`)
    messages.push(`Duplicate parts detected â€” deck is illegal. (${list.join(" Â· ")})`)
  }

  let recommendations: Combo[] = []
  if (status === "incomplete") {
    const missing = 3 - fullCount
    recommendations = recommendMissingCombosFromTopCut({ count: missing, currentCombos: combos, topCutCombosSorted })
    if (recommendations.length === 0 && topCutCombosSorted.length > 0) messages.push("No non-conflicting top-cut combos found. Try changing one part to open up options.")
  }

  let swaps: ValidationResult["swaps"] = []
  if (status === "illegal") {
    swaps = proposeSwapsForDuplicates({ combos, dupes, topBlades: sortByFreqArray(blades, bladeFreq), topRatchets: sortByFreqArray(ratchets, ratchetFreq), topBits: sortByFreqArray(bits, bitFreq) })
    if (swaps.length === 0) messages.push("No safe automatic swaps available â€” try changing one duplicated part to a different popular option.")
    else messages.push("Use the suggestions below to fix duplicates automatically.")
  }

  if (status === "ok" && visibleCombos < 3) messages.push("Tip: Keep all 3 combos visible for quick edits.")

  return { status, messages, missingCombos: Math.max(0, 3 - fullCount), duplicateParts: dupes, recommendations, swaps }
}

function sortByFreqArray(arr: string[], map: Record<string, number>) { return [...arr].sort((a, b) => (map[b] || 0) - (map[a] || 0)) }

function conflictsWithDeck(c: Combo, deck: Combo[]) {
  const used = uniquePartsByCategory(deck.slice(0, 3))
  return used.blades.has(normalize(c.blade)) || used.ratchets.has(normalize(c.ratchet)) || used.bits.has(normalize(c.bit)) || deck.slice(0, 3).some(d => comboKey(d) === comboKey(c))
}

/* =======================================
   Deck Grade
======================================= */
function daysSince(iso?: string) {
  if (!iso) return Infinity
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return Infinity
  return Math.max(0, (Date.now() - d) / (1000 * 60 * 60 * 24))
}

function decayFromDays(days: number, lambda = 60) { if (!Number.isFinite(days)) return 0; return Math.exp(-days / lambda) }
function clamp01(x: number) { if (!Number.isFinite(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x }
function mapScoreToGrade(score: number): DeckGrade["grade"] { if (score >= 90) return "S"; if (score >= 80) return "A"; if (score >= 70) return "B"; if (score >= 55) return "C"; return "D" }
function percentile(arr: number[], p: number) { if (!arr.length) return 1; const sorted = [...arr].sort((a, b) => a - b); const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1)))); return Math.max(1, sorted[idx]) }
function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }

function computeDeckGrade({ results, combos, visibleCombos, globalMeta }: { results: any[]; combos: Combo[]; visibleCombos: number; globalMeta: GlobalMeta }): DeckGrade | null {
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
  else reasons.push("Stale â€” few recent appearances")

  if (diversity >= 70) reasons.push("Good part diversity")
  else if (diversity >= 40) reasons.push("Okay diversity")
  else reasons.push("Redundant parts â€” consider varying picks")

  return { score, grade, confidence, components: { strength: Math.round(deckStrength), recency: Math.round(deckRecency), diversity }, reasons, partsUniqueRatio }
}
