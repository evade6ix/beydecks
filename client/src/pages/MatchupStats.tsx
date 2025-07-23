// File: src/pages/MatchupStats.tsx
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Navigate, useNavigate } from "react-router-dom"

interface Combo {
  blade: string
  ratchet: string
  bit: string
  notes?: string
}

interface Matchup {
  id: string
  myCombo: Combo
  opponentCombo: Combo
  result: "win" | "loss"
}

export default function MatchupStats() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [selectedBlade, setSelectedBlade] = useState<string | null>(null)
  
  // Pagination states
  const [bladePage, setBladePage] = useState(1)
  const bladesPerPage = 10
  const [comboPage, setComboPage] = useState(1)
  const combosPerPage = 5

  useEffect(() => {
    if (user?.matchupHistory && Array.isArray(user.matchupHistory)) {
      const valid = (user.matchupHistory as Matchup[]).filter((m) => m?.id)
      setMatchups(valid)
    }
  }, [user])

  if (!isAuthenticated || !user) return <Navigate to="/user-login" />

  // Build blade stats with combos
  const bladeStats: Record<
    string,
    { wins: number; losses: number; combos: Record<string, { wins: number; losses: number }> }
  > = {}

  matchups.forEach((m) => {
    const { blade, ratchet, bit } = m.myCombo
    const comboKey = `${blade} | ${ratchet} | ${bit}`
    const bladeKey = blade.trim()

    if (!bladeStats[bladeKey]) {
      bladeStats[bladeKey] = {
        wins: 0,
        losses: 0,
        combos: {},
      }
    }

    if (!bladeStats[bladeKey].combos[comboKey]) {
      bladeStats[bladeKey].combos[comboKey] = { wins: 0, losses: 0 }
    }

    if (m.result === "win") {
      bladeStats[bladeKey].wins++
      bladeStats[bladeKey].combos[comboKey].wins++
    } else {
      bladeStats[bladeKey].losses++
      bladeStats[bladeKey].combos[comboKey].losses++
    }
  })

  // Sort blades by total matchups descending
  const sortedBlades = Object.entries(bladeStats).sort(
    ([, a], [, b]) => b.wins + b.losses - (a.wins + a.losses)
  )

  // Pagination slices
  const pagedBlades = sortedBlades.slice(
    (bladePage - 1) * bladesPerPage,
    bladePage * bladesPerPage
  )

  // Combos for selected blade, paginated
  const selectedCombos = selectedBlade
    ? Object.entries(bladeStats[selectedBlade]?.combos || {})
    : []

  const pagedCombos = selectedCombos.slice(
    (comboPage - 1) * combosPerPage,
    comboPage * combosPerPage
  )

  // When blade changes, reset comboPage
  const onSelectBlade = (blade: string) => {
    if (selectedBlade === blade) {
      setSelectedBlade(null)
    } else {
      setSelectedBlade(blade)
      setComboPage(1)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto text-white space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Blade Matchup Stats</h2>
        <button
          onClick={() => navigate("/profile")}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
        >
          Back to Profile
        </button>
      </div>

      {sortedBlades.length === 0 ? (
        <p className="text-gray-400">No matchups submitted yet.</p>
      ) : (
        <>
          <ul className="space-y-6">
            {pagedBlades.map(([blade, data]) => {
              const total = data.wins + data.losses
              const winRate = total > 0 ? ((data.wins / total) * 100).toFixed(1) : "0"
              return (
                <li key={blade} className="bg-gray-800 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{blade}</h3>
                    <button
                      onClick={() => onSelectBlade(blade)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      {selectedBlade === blade ? "Hide Combos" : "View Combos"}
                    </button>
                  </div>
                  <p className="text-gray-300">
                    Wins: {data.wins} | Losses: {data.losses} | Win Rate: {winRate}%
                  </p>

                  {selectedBlade === blade && (
                    <div className="mt-4 text-sm text-gray-200">
                      <h4 className="font-semibold mb-2">Combos:</h4>
                      <ul className="space-y-1">
                        {pagedCombos.map(([combo, record]) => {
                          const total = record.wins + record.losses
                          const winRate = total > 0 ? ((record.wins / total) * 100).toFixed(1) : "0"
                          return (
                            <li key={combo} className="border border-gray-600 p-2 rounded">
                              <p>
                                <strong>{combo}</strong>
                              </p>
                              <p>
                                Wins: {record.wins} | Losses: {record.losses} | Win Rate: {winRate}%
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                      <div className="flex justify-center mt-2 gap-2">
                        <button
                          disabled={comboPage === 1}
                          onClick={() => setComboPage(comboPage - 1)}
                          className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
                        >
                          Prev
                        </button>
                        <button
                          disabled={comboPage * combosPerPage >= selectedCombos.length}
                          onClick={() => setComboPage(comboPage + 1)}
                          className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="flex justify-center mt-4 gap-2">
            <button
              disabled={bladePage === 1}
              onClick={() => setBladePage(bladePage - 1)}
              className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={bladePage * bladesPerPage >= sortedBlades.length}
              onClick={() => setBladePage(bladePage + 1)}
              className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
