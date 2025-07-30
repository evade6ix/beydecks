import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL

export default function TournamentLab() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const [combos, setCombos] = useState([
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
  const resultsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/prep-decks/user/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.combos) setPreviousPrep(data)
      })
      .catch(() => null)
  }, [user])

  useEffect(() => {
    fetch(`${API}/events`)
      .then(res => res.json())
      .then(data => {
        const bladeSet = new Set<string>()
        const ratchetSet = new Set<string>()
        const bitSet = new Set<string>()

        data.forEach((event: any) => {
          event.topCut?.forEach((player: any) => {
            player.combos?.forEach((combo: any) => {
              if (combo.blade) bladeSet.add(combo.blade)
              if (combo.ratchet) ratchetSet.add(combo.ratchet)
              if (combo.bit) bitSet.add(combo.bit)
            })
          })
        })

        setBlades([...bladeSet].sort())
        setRatchets([...ratchetSet].sort())
        setBits([...bitSet].sort())
      })
      .catch(err => console.error("Failed to load parts", err))
  }, [])

  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [results])

  const updateCombo = (
    index: number,
    field: "blade" | "ratchet" | "bit",
    value: string
  ) => {
    const newCombos = [...combos]
    newCombos[index] = { ...newCombos[index], [field]: value }
    setCombos(newCombos)
  }

  const removeCombo = () => {
    if (visibleCombos > 1) {
      setVisibleCombos(visibleCombos - 1)
      const trimmed = [...combos]
      trimmed[visibleCombos - 1] = { blade: "", ratchet: "", bit: "" }
      setCombos(trimmed)
    }
  }

  const analyzeCombos = async () => {
    const validCombos = combos
      .slice(0, visibleCombos)
      .filter(c => c.blade && c.ratchet && c.bit)

    if (validCombos.length === 0) return alert("Please enter at least one full combo.")

    setLoadingAnalysis(true)
    try {
      const res = await fetch(`${API}/prep-decks/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combos: validCombos }),
      })

      const data = await res.json()
      setResults(data.analysis)
    } catch (err) {
      console.error(err)
      alert("Error analyzing combos")
    } finally {
      setLoadingAnalysis(false)
    }
  }

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

  return (
    <div className="p-6 text-white max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tournament Lab</h1>
      <p>Prep your deck by entering up to 3 combos below.</p>

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
      </div>

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
