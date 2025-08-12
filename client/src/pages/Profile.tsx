// File: src/pages/Profile.tsx
import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Swords,
  Trophy,
  CalendarDays,
  Plus,
  Trash2,
  LogOut,
  BarChart3,
  Percent,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react"

import { toast } from "react-hot-toast"
import { useAuth } from "../context/AuthContext"
import type { OwnedParts } from "../context/AuthContext"

const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const API_BASE = RAW
const api = (path: string) => `${API_BASE}/${String(path).replace(/^\/+/, "")}`

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
  placement: "First Place" | "Second Place" | "Third Place" | "Top Cut" | "DNQ" | string
}

export default function Profile() {
  const { isAuthenticated, user, logout } = useAuth()
  if (!isAuthenticated || !user) return <Navigate to="/user-auth" />

  type ProfileExtras = {
    bio?: string
    homeStore?: string
    avatarDataUrl?: string
    slug?: string
    ownedParts?: OwnedParts
  }
  const u = user as typeof user & ProfileExtras

  // Matchups
  const [myCombo, setMyCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [opponentCombo, setOpponentCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [result, setResult] = useState<"win" | "loss">("win")
  const [matchups, setMatchups] = useState<Matchup[]>(
    (user.matchupHistory as Matchup[] | undefined)?.filter((m) => m?.id) ?? []
  )
  const [page, setPage] = useState(1)
  const perPage = 5

  const [tournaments, setTournaments] = useState<Tournament[]>(user.tournamentsPlayed || [])
  const [tournamentPage, setTournamentPage] = useState(1)
  const tournamentsPerPage = 5

  // Derived stats
  const wins = useMemo(() => matchups.filter((m) => m.result === "win").length, [matchups])
  const losses = useMemo(() => matchups.filter((m) => m.result === "loss").length, [matchups])
  const winRate = useMemo(
    () => (matchups.length > 0 ? ((wins / matchups.length) * 100).toFixed(1) : "0"),
    [wins, matchups.length]
  )

  const firsts = useMemo(() => tournaments.filter((t) => t.placement === "First Place").length, [tournaments])
  const seconds = useMemo(() => tournaments.filter((t) => t.placement === "Second Place").length, [tournaments])
  const thirds = useMemo(() => tournaments.filter((t) => t.placement === "Third Place").length, [tournaments])
  const topCutCount = useMemo(
    () =>
      tournaments.filter((t) =>
        ["First Place", "Second Place", "Third Place", "Top Cut"].includes(t.placement)
      ).length,
    [tournaments]
  )

  // Best placement across all tournaments (First > Second > Third > Top Cut)
  const placementRank = (p: string) =>
    ({ "First Place": 4, "Second Place": 3, "Third Place": 2, "Top Cut": 1 } as const)[p] ?? 0

  const bestPlacement = useMemo(() => {
    let best = "—"
    let bestScore = 0
    for (const t of tournaments) {
      const score = placementRank(t.placement)
      if (score > bestScore) {
        bestScore = score
        best = t.placement
      }
    }
    return best
  }, [tournaments])

  useEffect(() => setPage(1), [matchups.length])
  useEffect(() => setTournamentPage(1), [tournaments.length])

  // Profile state
  const [bio, setBio] = useState<string>(u.bio || "")
  const [homeStore, setHomeStore] = useState<string>(u.homeStore || "")
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(u.avatarDataUrl || "")

  // Public profile URL
  const publicPath = `/u/${(u.slug || u.username || user.username || "").trim()}`

  // Helpers
  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // API
  async function patchMe(payload: Record<string, any>) {
    const token = localStorage.getItem("token")
    if (!token) throw new Error("No auth token")
    const res = await fetch(api("/users/me"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text().catch(() => "Failed"))
    return res.json()
  }

  async function handleAvatarChange(dataUrl: string) {
    // optimistic UI
    setAvatarDataUrl(dataUrl)
    try {
      const updated = await patchMe({ avatarDataUrl: dataUrl })
      u.avatarDataUrl = updated.avatarDataUrl || ""
      toast.success(dataUrl ? "Avatar updated." : "Avatar removed.")
    } catch (e) {
      console.warn("avatar patch failed (UI kept optimistically):", e)
      toast.error("Saved, but response failed — will sync on refresh.")
    }
  }

  async function saveProfile(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault()
    try {
      const updated = await patchMe({ bio, homeStore, keepSlug: true })
      u.bio = updated.bio || ""
      u.homeStore = updated.homeStore || ""
      toast.success("Profile saved.")
    } catch (err) {
      console.warn(err)
      toast.error("Failed to save profile.")
    }
  }

  // Matchups / Tournaments handlers
  const handleSubmitMatchup: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    if (!myCombo.blade || !myCombo.ratchet || !myCombo.bit) return toast.error("Fill your combo completely.")
    if (!opponentCombo.blade || !opponentCombo.ratchet || !opponentCombo.bit)
      return toast.error("Fill opponent combo completely.")

    const res = await fetch(api("/auth/submit-matchup"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ myCombo, opponentCombo, result }),
    })

    if (res.ok) {
      const { matchup } = await res.json()
      const updated = [matchup, ...matchups]
      setMatchups(updated)
      user.matchupHistory = updated
      setMyCombo({ blade: "", ratchet: "", bit: "", notes: "" })
      setOpponentCombo({ blade: "", ratchet: "", bit: "", notes: "" })
      toast.success("Matchup submitted!")
    } else {
      toast.error("Failed to submit matchup.")
    }
  }

  const handleDeleteMatchup = async (toDeleteId: string) => {
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    const res = await fetch(api(`/auth/matchup/${toDeleteId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const updated = matchups.filter((m) => m.id !== toDeleteId)
      setMatchups(updated)
      user.matchupHistory = updated
      toast.success("Matchup deleted.")
    } else {
      toast.error("Failed to delete matchup.")
    }
  }

  const handleDeleteTournament = async (index: number) => {
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    try {
      const res = await fetch(api(`/auth/tournament/${index}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const updated = tournaments.filter((_, i) => i !== index)
        setTournaments(updated)
        user.tournamentsPlayed = updated
        toast.success("Tournament deleted.")
      } else {
        toast.error("Failed to delete tournament.")
      }
    } catch {
      toast.error("Failed to delete tournament.")
    }
  }

  const Progress = ({ pct }: { pct: number }) => (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )

  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
      {children}
    </span>
  )

  return (
    <motion.div className="mx-auto max-w-6xl p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* HERO (avatar + mini stats + bio editor) */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/15 via-sky-600/10 to-fuchsia-600/10 p-5 md:p-6">
        <div className="relative flex flex-wrap items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={avatarDataUrl || "/default-avatar.png"}
              alt="avatar"
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
            />
            <div className="mt-2 flex gap-2 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const dataUrl = await fileToDataUrl(f)
                    setAvatarDataUrl(dataUrl) // show immediately
                    await handleAvatarChange(dataUrl) // persist
                  }}
                />
                Change
              </label>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    setAvatarDataUrl("")
                    await handleAvatarChange("")
                  }}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-rose-300 hover:text-rose-200"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Name + pills + bio */}
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{u.username || user.username}</h1>

            {/* Mini stats */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
              <Pill>
                <Users className="mr-1 h-3.5 w-3.5" /> {matchups.length} matchups
              </Pill>
              <Pill>
                <Trophy className="mr-1 h-3.5 w-3.5" /> {tournaments.length} tournaments
              </Pill>
              <Pill>
                <Percent className="mr-1 h-3.5 w-3.5" /> {winRate}% win rate
              </Pill>
            </div>

            {/* Bio editor inline */}
            <div className="mt-3">
              <label className="flex flex-col text-sm">
                <textarea
                  className="min-h-[96px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-500/50"
                  placeholder="Tell people about you…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">{bio.length}/500</span>
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="rounded-xl bg-emerald-600/90 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500"
                  >
                    Save Bio
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-start gap-2">
            <Link
              to={publicPath}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 inline-flex items-center gap-1"
              title="Visit Public Profile"
              target="_blank"
            >
              Visit Public Profile
            </Link>
            <Link
              to="/tournament-lab"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 inline-flex items-center gap-1"
              title="Tournament Lab"
            >
              <BarChart3 className="h-4 w-4" />
              Tournament Lab
            </Link>
            <button
              onClick={logout}
              className="rounded-xl bg-rose-600/90 px-3 py-1.5 text-sm hover:bg-rose-500 inline-flex items-center gap-1"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Percent className="h-4 w-4" /> Win Rate
          </div>
          <div className="mt-1 text-2xl font-bold">{winRate}%</div>
          <div className="mt-2">
            <Progress pct={Number(winRate)} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Swords className="h-4 w-4" /> Record
          </div>
          <div className="mt-1 text-2xl font-bold">
            {wins}-{losses}
          </div>
          <div className="mt-1 text-xs opacity-70">{matchups.length} matches</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4" /> Top Cuts
          </div>
          <div className="mt-1 text-2xl font-bold">{topCutCount}</div>
          <div className="mt-1 text-xs opacity-70">
            {firsts}×1st • {seconds}×2nd • {thirds}×3rd
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" /> Tournaments
          </div>
          <div className="mt-1 text-2xl font-bold">{tournaments.length}</div>
          <div className="mt-1 text-xs opacity-70">Lifetime entries</div>
        </div>
      </div>

      {/* CAREER SNAPSHOT */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Career Snapshot
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-wide text-white/60">Best Placement</div>
                <div className="mt-1 text-lg font-semibold">{bestPlacement}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-wide text-white/60">Recent Activity</div>
                <div className="mt-1 text-sm">
                  {tournaments[0]?.date ? new Date(tournaments[0].date).toLocaleDateString() : "No tournaments yet"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-wide text-white/60">Public Profile</div>
                <Link
                  to={publicPath}
                  target="_blank"
                  className="mt-1 inline-flex items-center gap-1 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500"
                >
                  Visit Public Profile
                </Link>
              </div>
            </div>

            {/* Home Store inline card */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <LabelInput
                label="Home Store"
                value={homeStore}
                onChange={setHomeStore}
                placeholder="Type your store name"
              />
              <button
                type="button"
                onClick={saveProfile}
                className="mt-3 rounded-xl bg-emerald-600/90 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
              >
                Save Home Store
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              Tip: Track your practice with{" "}
              <Link to="/profile/matchup-stats" className="text-indigo-300 hover:text-indigo-200 underline">
                Matchup Stats
              </Link>{" "}
              to see blade performance over time.
            </div>
          </div>
        </div>

        {/* Right: CTA */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold">Tournament Lab</div>
            <p className="text-sm text-white/70">
              Test your deck against real event data to see how often it appears in top cut.
            </p>
            <Link
              to="/tournament-lab"
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500"
            >
              <BarChart3 className="h-4 w-4" />
              Launch Tournament Lab
            </Link>
          </div>
        </div>
      </div>

      {/* MATCHUPS SECTION */}
      <div className="mt-5 space-y-4">
        <form onSubmit={handleSubmitMatchup} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Swords className="h-4 w-4" /> Submit Matchup
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 font-medium">Your Combo</div>
              <TextInput placeholder="Blade" value={myCombo.blade} onChange={(v) => setMyCombo({ ...myCombo, blade: v })} />
              <TextInput placeholder="Ratchet" value={myCombo.ratchet} onChange={(v) => setMyCombo({ ...myCombo, ratchet: v })} />
              <TextInput placeholder="Bit" value={myCombo.bit} onChange={(v) => setMyCombo({ ...myCombo, bit: v })} />
              <TextInput placeholder="Notes (optional)" value={myCombo.notes || ""} onChange={(v) => setMyCombo({ ...myCombo, notes: v })} />
            </div>
            <div>
              <div className="mb-2 font-medium">Opponent Combo</div>
              <TextInput placeholder="Blade" value={opponentCombo.blade} onChange={(v) => setOpponentCombo({ ...opponentCombo, blade: v })} />
              <TextInput placeholder="Ratchet" value={opponentCombo.ratchet} onChange={(v) => setOpponentCombo({ ...opponentCombo, ratchet: v })} />
              <TextInput placeholder="Bit" value={opponentCombo.bit} onChange={(v) => setOpponentCombo({ ...opponentCombo, bit: v })} />
              <TextInput placeholder="Notes (optional)" value={opponentCombo.notes || ""} onChange={(v) => setOpponentCombo({ ...opponentCombo, notes: v })} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" className="accent-indigo-500" checked={result === "win"} onChange={() => setResult("win")} />
              <span>Win</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" className="accent-indigo-500" checked={result === "loss"} onChange={() => setResult("loss")} />
              <span>Loss</span>
            </label>
          </div>

          <button type="submit" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500">
            <Plus className="h-4 w-4" /> Submit Matchup
          </button>
        </form>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" /> Matchup History
            </div>
            <Link to="/profile/matchup-stats" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
              <BarChart3 className="h-4 w-4" /> View Data
            </Link>
          </div>

          {matchups.length === 0 ? (
            <div className="text-sm text-white/60">No matchups submitted yet.</div>
          ) : (
            <>
              <ul className="space-y-3">
                {matchups.slice((page - 1) * perPage, page * perPage).map((m) => (
                  <li key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-sm font-semibold ${m.result === "win" ? "text-emerald-300" : "text-rose-300"}`}>
                        {m.result.toUpperCase()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMatchup(m.id)}
                        className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                        title="Delete matchup"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white/5 p-2">
                        <div className="mb-1 font-medium">Your Combo</div>
                        <div>{m.myCombo.blade} / {m.myCombo.ratchet} / {m.myCombo.bit}</div>
                        {m.myCombo.notes ? <div className="mt-0.5 text-xs text-white/60">{m.myCombo.notes}</div> : null}
                      </div>
                      <div className="rounded-xl bg-white/5 p-2">
                        <div className="mb-1 font-medium">Opponent Combo</div>
                        <div>{m.opponentCombo.blade} / {m.opponentCombo.ratchet} / {m.opponentCombo.bit}</div>
                        {m.opponentCombo.notes ? <div className="mt-0.5 text-xs text-white/60">{m.opponentCombo.notes}</div> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                  Page {page} / {Math.max(1, Math.ceil(matchups.length / perPage))}
                </span>
                <button
                  disabled={page * perPage >= matchups.length}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TOURNAMENTS SECTION */}
      <div className="mt-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Tournament History
          </div>

          {tournaments.length === 0 ? (
            <div className="text-sm text-white/60">No tournaments submitted yet.</div>
          ) : (
            <>
              <ul className="space-y-3">
                {tournaments
                  .slice((tournamentPage - 1) * tournamentsPerPage, tournamentPage * tournamentsPerPage)
                  .map((t, idx) => {
                    const globalIndex = (tournamentPage - 1) * tournamentsPerPage + idx
                    const eventId = (t as any).eventId ?? (t as any).id
                    return (
                      <li key={globalIndex} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className={`text-sm font-semibold ${
                            t.placement === "First Place"
                              ? "text-yellow-300"
                              : t.placement === "Second Place"
                              ? "text-slate-200"
                              : t.placement === "Third Place"
                              ? "text-amber-400"
                              : t.placement === "Top Cut"
                              ? "text-indigo-300"
                              : "text-white/70"
                          }`}>
                            {t.placement}
                          </div>
                          <div className="flex items-center gap-2">
                            {eventId ? (
                              <Link
                                to={`/events/${eventId}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
                              >
                                View Event
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteTournament(globalIndex)}
                              className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="rounded-xl bg-white/5 p-2">
                            <div className="text-xs uppercase tracking-wide text-white/60">Store</div>
                            <div className="mt-0.5">{t.storeName || "—"}</div>
                          </div>
                          <div className="rounded-xl bg-white/5 p-2">
                            <div className="text-xs uppercase tracking-wide text-white/60">Date</div>
                            <div className="mt-0.5">
                              {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/5 p-2">
                            <div className="text-xs uppercase tracking-wide text-white/60">Players</div>
                            <div className="mt-0.5">{t.totalPlayers ?? 0}</div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
              </ul>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  disabled={tournamentPage === 1}
                  onClick={() => setTournamentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                  Page {tournamentPage} / {Math.max(1, Math.ceil(tournaments.length / tournamentsPerPage))}
                </span>
                <button
                  disabled={tournamentPage * tournamentsPerPage >= tournaments.length}
                  onClick={() => setTournamentPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* Mini UI pieces */
function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-500/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function LabelInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: number
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="mb-1 text-white/90">{label}</span>
      <input
        type={type}
        min={min}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-500/50"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
