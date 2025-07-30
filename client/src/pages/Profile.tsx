// File: src/pages/Profile.tsx
import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Link } from "react-router-dom" 

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

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

interface Tournament {
  storeName: string
  date: string
  totalPlayers: number
  roundWins: number
  roundLosses: number
  placement: string
}

export default function Profile() {
  const { isAuthenticated, user, logout } = useAuth()
  

  if (!isAuthenticated || !user) return <Navigate to="/user-auth" />

  const [myCombo, setMyCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [opponentCombo, setOpponentCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [result, setResult] = useState<"win" | "loss">("win")
  const [page, setPage] = useState(1)
  const perPage = 5
  const [_, forceUpdate] = useState(0)

  const [matchups, setMatchups] = useState<Matchup[]>(
    (user.matchupHistory as Matchup[] | undefined)?.filter((m) => m?.id) ?? []
  )

  const [tournament, setTournament] = useState<Tournament>({
    storeName: "",
    date: "",
    totalPlayers: 0,
    roundWins: 0,
    roundLosses: 0,
    placement: "DNQ",
  })

  const [tournaments, setTournaments] = useState<Tournament[]>(user.tournamentsPlayed || [])
  const [tournamentPage, setTournamentPage] = useState(1)
  const tournamentsPerPage = 5

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  const token = localStorage.getItem("token")
  if (!token) return

  const res = await fetch(`${API}/auth/submit-matchup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ myCombo, opponentCombo, result }),
  })

  if (res.ok) {
    const { matchup } = await res.json()

    const updated = [matchup, ...matchups]
    setMatchups(updated)
    user.matchupHistory = updated

    setMyCombo({ blade: "", ratchet: "", bit: "", notes: "" })
    setOpponentCombo({ blade: "", ratchet: "", bit: "", notes: "" })
  } else {
    alert("Failed to submit matchup")
  }
}

const handleDeleteTournament = async (index: number) => {
  const token = localStorage.getItem("token")
  if (!token) return

  try {
    const res = await fetch(`${API}/auth/tournament/${index}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.ok) {
      const updated = tournaments.filter((_, i) => i !== index)
      setTournaments(updated)
      user.tournamentsPlayed = updated

      // 🔁 Recalculate stats
      const placementStats = {
        firsts: 0,
        seconds: 0,
        thirds: 0,
        topCutCount: 0,
      }

      for (const t of updated) {
        if (t.placement === "First Place") placementStats.firsts++
        if (t.placement === "Second Place") placementStats.seconds++
        if (t.placement === "Third Place") placementStats.thirds++
        if (["First Place", "Second Place", "Third Place", "Top Cut"].includes(t.placement)) {
          placementStats.topCutCount++
        }
      }

      user.firsts = placementStats.firsts
      user.seconds = placementStats.seconds
      user.thirds = placementStats.thirds
      user.topCutCount = placementStats.topCutCount

      // 🔁 Force refresh to rerender updated stats
      forceUpdate((n) => n + 1)
    } else {
      alert("Failed to delete tournament")
    }
  } catch (err) {
    console.error(err)
    alert("Failed to delete tournament")
  }
}

  const wins = matchups.filter((m) => m.result === "win").length
  const losses = matchups.filter((m) => m.result === "loss").length
  const winRate = matchups.length > 0 ? ((wins / matchups.length) * 100).toFixed(1) : "0"
  // 🔢 Recalculate tournament placement stats live
const firsts = tournaments.filter((t) => t.placement === "First Place").length
const seconds = tournaments.filter((t) => t.placement === "Second Place").length
const thirds = tournaments.filter((t) => t.placement === "Third Place").length
const topCutCount = tournaments.filter((t) =>
  ["First Place", "Second Place", "Third Place", "Top Cut"].includes(t.placement)
).length


  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold mb-1">Welcome: {user.username}!</h2>
        <button
          onClick={logout}
          className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            logout
          </button>
      </div>

      {user.badge === "Admin" && (
  <Link to="/admin">
    <button className="mt-2 bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600">
      Go to Admin Panel
    </button>
  </Link>
)}

{user.storeAccess && (
  <Link to="/store-admin">
    <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
      Manage Your Store Events
    </button>
  </Link>
)}


      <div className="bg-gray-800 p-4 rounded shadow">
        <h3 className="text-lg font-semibold text-white mb-2">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
  <p>Total Tournaments Played: {tournaments.length}</p>
  <p>Top Cut Placements: {topCutCount}</p>
  <p>🥇 1st Place Finishes: {firsts}</p>
  <p>🥈 2nd Place Finishes: {seconds}</p>
  <p>🥉 3rd Place Finishes: {thirds}</p>
  <p>Matchups Submitted: {matchups.length}</p>
  <p>Wins: {wins} | Losses: {losses}</p>
  <p>Win Rate: {winRate}%</p>
</div>
{/* 🔬 Tournament Lab CTA */}
<div className="bg-base-200 mt-4 p-4 rounded text-center">
  <h3 className="text-lg font-bold mb-1">🔬 Try Tournament Lab</h3>
  <p className="text-sm text-neutral-content mb-3">
    Curious how your combo would perform in real events? Test it against actual tournament data to see how often it appears in top cut results.
  </p>
  <a
    href="/tournament-lab"
    className="btn btn-accent btn-sm inline-flex"
  >
    Launch Tournament Lab
  </a>
</div>

      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Submit Matchup</h3>
        <form onSubmit={handleSubmit} className="space-y-3 bg-gray-900 p-4 rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold mb-2">Your Combo</h4>
              <input className="input" placeholder="Blade" value={myCombo.blade} onChange={(e) => setMyCombo({ ...myCombo, blade: e.target.value })} />
              <input className="input" placeholder="Ratchet" value={myCombo.ratchet} onChange={(e) => setMyCombo({ ...myCombo, ratchet: e.target.value })} />
              <input className="input" placeholder="Bit" value={myCombo.bit} onChange={(e) => setMyCombo({ ...myCombo, bit: e.target.value })} />
              <input className="input" placeholder="Notes" value={myCombo.notes} onChange={(e) => setMyCombo({ ...myCombo, notes: e.target.value })} />
            </div>
            <div>
              <h4 className="font-bold mb-2">Opponent Combo</h4>
              <input className="input" placeholder="Blade" value={opponentCombo.blade} onChange={(e) => setOpponentCombo({ ...opponentCombo, blade: e.target.value })} />
              <input className="input" placeholder="Ratchet" value={opponentCombo.ratchet} onChange={(e) => setOpponentCombo({ ...opponentCombo, ratchet: e.target.value })} />
              <input className="input" placeholder="Bit" value={opponentCombo.bit} onChange={(e) => setOpponentCombo({ ...opponentCombo, bit: e.target.value })} />
              <input className="input" placeholder="Notes" value={opponentCombo.notes} onChange={(e) => setOpponentCombo({ ...opponentCombo, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label>
              <input type="radio" checked={result === "win"} onChange={() => setResult("win")} />
              <span className="ml-1">Win</span>
            </label>
            <label>
              <input type="radio" checked={result === "loss"} onChange={() => setResult("loss")} />
              <span className="ml-1">Loss</span>
            </label>
          </div>

          <button type="submit" className="bg-blue-600 px-4 py-2 text-white rounded hover:bg-blue-700">
            Submit Matchup
          </button>
        </form>
      </div>
<div className="pt-6">
  <h3 className="text-lg font-semibold mb-2">Submit Tournament</h3>
  <form
    onSubmit={async (e) => {
      e.preventDefault()
      const token = localStorage.getItem("token")
      const res = await fetch(`${API}/auth/submit-tournament`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, ...tournament }),
      })

     if (res.ok) {
  let newTournament
  try {
    newTournament = await res.json()
    console.log("New tournament response:", newTournament) // ← ADD THIS HERE
  } catch {
    console.error("Failed to parse JSON from server")
    alert("Server returned invalid response")
    return
  }


  // 🛠️ Normalize the date so it's readable immediately
  if (newTournament.date) {
    newTournament.date = new Date(newTournament.date).toISOString()
  }

const updated = [newTournament, ...tournaments]
setTournaments(updated)
user.tournamentsPlayed = updated

// 🔁 Recalculate placement stats for the user
const placementStats = {
  firsts: 0,
  seconds: 0,
  thirds: 0,
  topCutCount: 0,
}
for (const t of updated) {
  if (t.placement === "First Place") placementStats.firsts++
  if (t.placement === "Second Place") placementStats.seconds++
  if (t.placement === "Third Place") placementStats.thirds++
  if (["First Place", "Second Place", "Third Place", "Top Cut"].includes(t.placement)) {
    placementStats.topCutCount++
  }
}

user.firsts = placementStats.firsts
user.seconds = placementStats.seconds
user.thirds = placementStats.thirds
user.topCutCount = placementStats.topCutCount

  setTournament({
    storeName: "",
    date: "",
    totalPlayers: 0,
    roundWins: 0,
    roundLosses: 0,
    placement: "DNQ",
  })
} else {
  alert("Failed to submit tournament")
}

    }}
    className="space-y-3 bg-gray-900 p-4 rounded"
  >
    <div className="grid grid-cols-2 gap-4">
      <label className="text-sm text-white flex flex-col">
        Store Name
        <input
          className="input"
          placeholder="Store Name"
          value={tournament.storeName}
          onChange={(e) => setTournament({ ...tournament, storeName: e.target.value })}
        />
      </label>

      <label className="text-sm text-white flex flex-col">
        Date
        <input
          type="date"
          className="input"
          value={tournament.date}
          onChange={(e) => setTournament({ ...tournament, date: e.target.value })}
        />
      </label>

      <label className="text-sm text-white flex flex-col">
        Total Players
        <input
          type="number"
          min={0}
          className="input"
          placeholder="Total Players"
          value={tournament.totalPlayers}
          onChange={(e) => setTournament({ ...tournament, totalPlayers: +e.target.value })}
        />
      </label>

      <label className="text-sm text-white flex flex-col">
        Round Wins
        <input
          type="number"
          min={0}
          className="input"
          placeholder="Round Wins"
          value={tournament.roundWins}
          onChange={(e) => setTournament({ ...tournament, roundWins: +e.target.value })}
        />
      </label>

      <label className="text-sm text-white flex flex-col">
        Round Losses
        <input
          type="number"
          min={0}
          className="input"
          placeholder="Round Losses"
          value={tournament.roundLosses}
          onChange={(e) => setTournament({ ...tournament, roundLosses: +e.target.value })}
        />
      </label>

      <label className="text-sm text-white flex flex-col">
        Placement
        <select
          className="input"
          value={tournament.placement}
          onChange={(e) => setTournament({ ...tournament, placement: e.target.value })}
        >
          <option>First Place</option>
          <option>Second Place</option>
          <option>Third Place</option>
          <option>Top Cut</option>
          <option>DNQ</option>
        </select>
      </label>
    </div>

    <button type="submit" className="bg-green-600 px-4 py-2 text-white rounded hover:bg-green-700">
      Submit Tournament
    </button>
  </form>
</div>
<div className="pt-6">
  <div className="flex justify-between items-center mb-2">
    <h3 className="text-lg font-semibold">Matchup History</h3>
    <Link
  to="/profile/matchup-stats"
  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
>
  View Data
</Link>

  </div>

  {matchups.length === 0 ? (
    <p className="text-gray-500">No matchups submitted yet.</p>
  ) : (
    <>
      <ul className="space-y-4">
        {matchups.slice((page - 1) * perPage, page * perPage).map((matchup) => (
          <li key={matchup.id} className="bg-gray-800 p-4 rounded shadow text-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-white">Your Combo</h4>
                <p>Blade: {matchup.myCombo.blade}</p>
                <p>Ratchet: {matchup.myCombo.ratchet}</p>
                <p>Bit: {matchup.myCombo.bit}</p>
                {matchup.myCombo.notes && <p>Notes: {matchup.myCombo.notes}</p>}
              </div>
              <div>
                <h4 className="font-bold text-white">Opponent Combo</h4>
                <p>Blade: {matchup.opponentCombo.blade}</p>
                <p>Ratchet: {matchup.opponentCombo.ratchet}</p>
                <p>Bit: {matchup.opponentCombo.bit}</p>
                {matchup.opponentCombo.notes && <p>Notes: {matchup.opponentCombo.notes}</p>}
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className={`font-semibold ${matchup.result === "win" ? "text-green-400" : "text-red-400"}`}>
                {matchup.result.toUpperCase()}
              </span>
              <button
                onClick={async () => {
                  const token = localStorage.getItem("token")
                  const res = await fetch(`${API}/auth/matchup/${matchup.id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  })

                  if (res.ok) {
                    const updated = matchups.filter((m) => m.id !== matchup.id)
                    setMatchups(updated)
                    user.matchupHistory = updated
                    forceUpdate((n) => n + 1)
                  } else {
                    alert("Failed to delete matchup")
                  }
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-center mt-4 gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
        >
          Prev
        </button>
        <button
          disabled={page * perPage >= matchups.length}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </>
  )}
</div>

      <div className="pt-6">
        <h3 className="text-lg font-semibold mb-2">Tournament History</h3>
        {tournaments.length === 0 ? (
          <p className="text-gray-500">No tournaments submitted yet.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {tournaments
                .slice((tournamentPage - 1) * tournamentsPerPage, tournamentPage * tournamentsPerPage)
                .map((tournament, idx) => (
                  <li key={idx} className="bg-gray-800 p-4 rounded shadow text-gray-200">
                    <p><strong>🏪 Store:</strong> {tournament.storeName}</p>
                    <p><strong>📅 Date:</strong> {new Date(tournament.date).toLocaleDateString()}</p>
                    <p><strong>👥 Total Players:</strong> {tournament.totalPlayers}</p>
                    <p><strong>🆖 Record:</strong> {tournament.roundWins} Wins / {tournament.roundLosses} Losses</p>
                    <p><strong>🏫 Placement:</strong> {tournament.placement}</p>
                    <button
                    type = "button"
  onClick={() => handleDeleteTournament((tournamentPage - 1) * tournamentsPerPage + idx)}
  className="text-sm text-red-500 hover:text-red-700 mt-2"
>
  Delete
</button>

                  </li>
                ))}
            </ul>

            <div className="flex justify-center mt-4 gap-2">
              <button
                disabled={tournamentPage === 1}
                onClick={() => setTournamentPage(tournamentPage - 1)}
                className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
              >
                Prev
              </button>
              <button
                disabled={tournamentPage * tournamentsPerPage >= tournaments.length}
                onClick={() => setTournamentPage(tournamentPage + 1)}
                className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}