import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, Camera, Check, ChevronLeft,
  ChevronRight, Crown, ExternalLink, FlaskConical, History, Loader2, LogOut,
  MapPin, Medal, Package, Percent, Plus, Save, Settings, ShieldAlert, Swords,
  Target, Trash2, Trophy, UserRound, X,
} from "lucide-react"
import { toast } from "react-hot-toast"

import VipBanner from "../components/VipBanner"
import { useAuth } from "../context/AuthContext"
import type { OwnedParts } from "../context/AuthContext"
import { TROPHY_AWARDS } from "../data/trophies"

const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
const api = (path: string) => `${RAW}/${String(path).replace(/^\/+/, "")}`

interface Combo { blade: string; ratchet: string; bit: string; notes?: string }
interface Matchup { id: string; myCombo: Combo; opponentCombo: Combo; result: "win" | "loss" }
interface Tournament {
  storeName: string
  date: string
  totalPlayers: number
  roundWins: number
  roundLosses: number
  placement: "First Place" | "Second Place" | "Third Place" | "Top Cut" | "DNQ" | string
  eventId?: string | number
  id?: string | number
}

type ProfileTab = "overview" | "matchups" | "collection" | "settings"
const emptyParts: OwnedParts = { blades: [], assistBlades: [], ratchets: [], bits: [] }
const reveal = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.38 } }
const winRateOverrides: Record<string, { title: string; suffix: string }> = {
  karl6ix: { title: "Does Tian Pull?", suffix: "No Hoes LOL" },
  kwfors1: { title: "Does Tian Pull?", suffix: "No Hoes LOL" },
  "tian-mandani": { title: "Does Tian Pull?", suffix: "No Hoes LOL" },
  martindeasis: { title: "WBO Win Rate", suffix: "Back to Gundam Lil Bro" },
}

export default function Profile() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  if (!isAuthenticated || !user) return <Navigate to="/user-auth" />

  type ProfileExtras = { bio?: string; homeStore?: string; avatarDataUrl?: string; slug?: string; ownedParts?: OwnedParts; vip?: boolean }
  const authUser = user
  const u = authUser as typeof authUser & ProfileExtras

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview")
  const [isVip, setIsVip] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [myCombo, setMyCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [opponentCombo, setOpponentCombo] = useState<Combo>({ blade: "", ratchet: "", bit: "", notes: "" })
  const [result, setResult] = useState<"win" | "loss">("win")
  const [matchups, setMatchups] = useState<Matchup[]>(((authUser.matchupHistory as Matchup[] | undefined) ?? []).filter((matchup) => matchup?.id))
  const [page, setPage] = useState(1)
  const perPage = 5
  const [tournaments, setTournaments] = useState<Tournament[]>(authUser.tournamentsPlayed || [])
  const [tournamentPage, setTournamentPage] = useState(1)
  const tournamentsPerPage = 5
  const [bio, setBio] = useState(u.bio || "")
  const [homeStore, setHomeStore] = useState(u.homeStore || "")
  const [avatarDataUrl, setAvatarDataUrl] = useState(u.avatarDataUrl || "")

  const wins = useMemo(() => matchups.filter((matchup) => matchup.result === "win").length, [matchups])
  const losses = useMemo(() => matchups.filter((matchup) => matchup.result === "loss").length, [matchups])
  const winRate = useMemo(() => (matchups.length ? ((wins / matchups.length) * 100).toFixed(1) : "0"), [matchups.length, wins])
  const firsts = useMemo(() => tournaments.filter((tournament) => tournament.placement === "First Place").length, [tournaments])
  const seconds = useMemo(() => tournaments.filter((tournament) => tournament.placement === "Second Place").length, [tournaments])
  const thirds = useMemo(() => tournaments.filter((tournament) => tournament.placement === "Third Place").length, [tournaments])
  const topCutCount = useMemo(() => tournaments.filter((tournament) => ["First Place", "Second Place", "Third Place", "Top Cut"].includes(tournament.placement)).length, [tournaments])
  const bestPlacement = useMemo(() => {
    const ranks: Record<string, number> = { "—": 0, "First Place": 4, "Second Place": 3, "Third Place": 2, "Top Cut": 1 }
    return tournaments.reduce((best, tournament) => (ranks[tournament.placement] > ranks[best] ? tournament.placement : best), "—")
  }, [tournaments])

  const winRateOverride = [u.slug, u.username, authUser.username]
    .map((value) => String(value || "").trim().toLowerCase())
    .map((key) => winRateOverrides[key]).find(Boolean)
  const winRateTitle = winRateOverride?.title ?? "Practice win rate"
  const winRateSuffix = winRateOverride && Number(winRate) === 0 ? winRateOverride.suffix : ""
  const ownedParts = u.ownedParts || emptyParts
  const collectionCount = ownedParts.blades.length + (ownedParts.assistBlades?.length || 0) + ownedParts.ratchets.length + ownedParts.bits.length
  const profileKey = String(u.slug || u.username || authUser.username || "").trim().toLowerCase()
  const trophies = useMemo(() => TROPHY_AWARDS
    .filter((trophy) => String(trophy.username || "").trim().toLowerCase() === profileKey)
    .slice().sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()), [profileKey])
  const publicPath = `/u/${String(u.slug || u.username || authUser.username || "").trim()}`
  const displayName = String(u.username || authUser.username || "Player")
  const accountUsername = String(u.username || authUser.username || "").trim()

  useEffect(() => setPage(1), [matchups.length])
  useEffect(() => setTournamentPage(1), [tournaments.length])
  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    async function loadVip() {
      try {
        const slug = String(u.slug || "").trim().toLowerCase()
        const username = String(u.username || authUser.username || "").trim()
        let data: { vip?: boolean } | null = null
        if (slug) {
          const response = await fetch(api(`/api/users/slug/${encodeURIComponent(slug)}`), { signal: controller.signal })
          if (response.ok) data = await response.json()
        }
        if (!data && username) {
          const response = await fetch(api(`/api/auth/user/${encodeURIComponent(username)}`), { signal: controller.signal })
          if (response.ok) data = await response.json()
        }
        if (alive) setIsVip(Boolean(data?.vip))
      } catch { if (alive) setIsVip(false) }
    }
    loadVip()
    return () => { alive = false; controller.abort() }
  }, [authUser.username, u.slug, u.username])

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function patchMe(payload: Record<string, unknown>) {
    const token = localStorage.getItem("token")
    if (!token) throw new Error("No auth token")
    const response = await fetch(api("/users/me"), { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
    if (!response.ok) throw new Error(await response.text().catch(() => "Failed"))
    return response.json()
  }

  async function handleAvatarChange(dataUrl: string) {
    setAvatarDataUrl(dataUrl)
    try {
      const updated = await patchMe({ avatarDataUrl: dataUrl })
      u.avatarDataUrl = updated.avatarDataUrl || ""
      toast.success(dataUrl ? "Avatar updated." : "Avatar removed.")
    } catch (error) { console.warn("avatar patch failed:", error); toast.error("Avatar could not be saved. Please try again.") }
  }

  async function saveProfile(event?: React.MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()
    try {
      const updated = await patchMe({ bio, homeStore, keepSlug: true })
      u.bio = updated.bio || ""
      u.homeStore = updated.homeStore || ""
      toast.success("Profile saved.")
    } catch (error) { console.warn(error); toast.error("Failed to save profile.") }
  }

  const handleSubmitMatchup: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    if (!myCombo.blade || !myCombo.ratchet || !myCombo.bit) return toast.error("Fill your combo completely.")
    if (!opponentCombo.blade || !opponentCombo.ratchet || !opponentCombo.bit) return toast.error("Fill the opponent combo completely.")
    const response = await fetch(api("/auth/submit-matchup"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ myCombo, opponentCombo, result }) })
    if (!response.ok) return toast.error("Failed to submit matchup.")
    const { matchup } = await response.json()
    const updated = [matchup, ...matchups]
    setMatchups(updated)
    authUser.matchupHistory = updated
    setMyCombo({ blade: "", ratchet: "", bit: "", notes: "" })
    setOpponentCombo({ blade: "", ratchet: "", bit: "", notes: "" })
    toast.success("Matchup submitted!")
  }

  const handleDeleteMatchup = async (matchupId: string) => {
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    const response = await fetch(api(`/auth/matchup/${matchupId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return toast.error("Failed to delete matchup.")
    const updated = matchups.filter((matchup) => matchup.id !== matchupId)
    setMatchups(updated)
    authUser.matchupHistory = updated
    toast.success("Matchup deleted.")
  }

  const handleDeleteTournament = async (index: number) => {
    const token = localStorage.getItem("token")
    if (!token) return toast.error("Please log in again.")
    try {
      const response = await fetch(api(`/auth/tournament/${index}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) return toast.error("Failed to delete tournament.")
      const updated = tournaments.filter((_, tournamentIndex) => tournamentIndex !== index)
      setTournaments(updated)
      authUser.tournamentsPlayed = updated
      toast.success("Tournament deleted.")
    } catch { toast.error("Failed to delete tournament.") }
  }

  const closeDeleteModal = () => {
    if (deletingAccount) return
    setDeleteModalOpen(false); setDeleteConfirmation(""); setDeleteError("")
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim() !== accountUsername || deletingAccount) return
    const token = localStorage.getItem("token")
    if (!token) { setDeleteError("Your session expired. Please log in again before deleting your account."); return }
    setDeletingAccount(true); setDeleteError("")
    try {
      const response = await fetch(api("/auth/me"), { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ confirmation: deleteConfirmation.trim() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to delete account")
      logout(); toast.success("Your MetaBeys account has been permanently deleted."); navigate("/", { replace: true })
    } catch (error) { setDeleteError(error instanceof Error ? error.message : "Failed to delete account"); setDeletingAccount(false) }
  }

  const HeroInner = (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1120] shadow-2xl shadow-black/20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_12%_110%,rgba(14,165,233,0.18),transparent_38%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative w-fit shrink-0">
              <img src={avatarDataUrl || "/default-avatar.png"} alt={`${displayName}'s avatar`} className="h-24 w-24 rounded-[26px] border border-white/15 object-cover shadow-xl shadow-black/30 sm:h-28 sm:w-28" />
              <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-indigo-500 text-white shadow-lg"><Target className="h-4 w-4" /></span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Player HQ</span></div>
              <h1 className="mt-2 truncate text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">{displayName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-sky-300" />{homeStore || "Home store not set"}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-indigo-300" />{tournaments.length} tournament records</span></div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{bio || "Build your competitive identity, track your results, and turn every launch into useful data."}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <Link to={publicPath} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.12]">View public profile <ExternalLink className="h-4 w-4" /></Link>
            <Link to="/tournament-lab" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-400">Tournament Lab <FlaskConical className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  )

  const tabs: Array<{ id: ProfileTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: "overview", label: "Overview", icon: <UserRound className="h-4 w-4" /> },
    { id: "matchups", label: "Matchups", icon: <Swords className="h-4 w-4" />, count: matchups.length },
    { id: "collection", label: "Collection", icon: <Package className="h-4 w-4" />, count: collectionCount },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ]

  const pagedTournaments = tournaments.slice((tournamentPage - 1) * tournamentsPerPage, tournamentPage * tournamentsPerPage)
  const pagedMatchups = matchups.slice((page - 1) * perPage, page * perPage)

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {isVip ? <VipBanner>{HeroInner}</VipBanner> : HeroInner}

        <nav aria-label="Profile sections" className="sticky top-3 z-20 mt-5 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0b0f1a]/90 p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${selected ? "text-white" : "text-white/45 hover:bg-white/[0.05] hover:text-white/80"}`}
                >
                  {selected ? <motion.span layoutId="profile-tab" className="absolute inset-0 rounded-xl border border-indigo-400/20 bg-indigo-500/15" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} /> : null}
                  <span className="relative flex items-center gap-2">{tab.icon}{tab.label}{typeof tab.count === "number" ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-indigo-400/20 text-indigo-200" : "bg-white/[0.06] text-white/35"}`}>{tab.count}</span> : null}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="mt-5">
          {activeTab === "overview" ? (
            <motion.div key="overview" {...reveal} className="space-y-5">
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={<Percent className="h-5 w-5" />} label={winRateTitle} value={`${winRate}%`} detail={winRateSuffix || `${wins} wins · ${losses} losses`} tone="indigo" />
                <MetricCard icon={<Swords className="h-5 w-5" />} label="Practice record" value={`${wins}–${losses}`} detail={`${matchups.length} matchups logged`} tone="sky" />
                <MetricCard icon={<Medal className="h-5 w-5" />} label="Top cuts" value={String(topCutCount)} detail={`${firsts} gold · ${seconds} silver · ${thirds} bronze`} tone="amber" />
                <MetricCard icon={<Trophy className="h-5 w-5" />} label="Best tournament finish" value={bestPlacement} detail={`${tournaments.length} events recorded`} tone="emerald" />
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
                <Panel>
                  <SectionHeading eyebrow="Competitive record" title="Tournament history" description="Every event, result, and placement in one clean timeline." icon={<History className="h-5 w-5" />} action={<Link to="/events/completed" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200">Completed events <ArrowRight className="h-4 w-4" /></Link>} />
                  {pagedTournaments.length ? (
                    <div className="mt-5 divide-y divide-white/[0.06]">
                      {pagedTournaments.map((tournament, index) => (
                        <TournamentRow key={`${tournament.storeName}-${tournament.date}-${index}`} tournament={tournament} onDelete={() => handleDeleteTournament((tournamentPage - 1) * tournamentsPerPage + index)} />
                      ))}
                    </div>
                  ) : <EmptyState icon={<Trophy className="h-6 w-6" />} title="No tournament results yet" description="Your next tournament entry will appear here with its record and placement." />}
                  <Pagination page={tournamentPage} total={tournaments.length} perPage={tournamentsPerPage} onChange={setTournamentPage} />
                </Panel>

                <div className="space-y-5">
                  <Panel>
                    <SectionHeading eyebrow="Achievements" title="Trophy cabinet" description="Highlights earned across the Beyblade community." icon={<Crown className="h-5 w-5" />} />
                    {trophies.length ? (
                      <div className="mt-5 space-y-3">
                        {trophies.map((trophy, index) => {
                          const external = /^https?:\/\//i.test(String(trophy.eventUrl || ""))
                          const inner = (
                            <>
                              <img src={trophy.image} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-amber-300/15 object-cover" />
                              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{trophy.placement}</p><p className="mt-1 truncate text-xs text-white/40">{trophy.note || trophy.event} · {safeDate(trophy.date)}</p></div>
                              {trophy.eventUrl ? <ExternalLink className="h-4 w-4 text-white/25" /> : null}
                            </>
                          )
                          const className = "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition hover:border-amber-300/20 hover:bg-amber-300/[0.04]"
                          if (!trophy.eventUrl) return <div key={`${trophy.id}-${index}`} className={className}>{inner}</div>
                          if (external) return <a key={`${trophy.id}-${index}`} href={trophy.eventUrl} target="_blank" rel="noreferrer" className={className}>{inner}</a>
                          return <Link key={`${trophy.id}-${index}`} to={trophy.eventUrl} className={className}>{inner}</Link>
                        })}
                      </div>
                    ) : <EmptyState compact icon={<Medal className="h-5 w-5" />} title="Cabinet ready" description="Community awards and event trophies will live here." />}
                  </Panel>

                  <Link to="/tournament-lab" className="group relative block overflow-hidden rounded-[24px] border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-[#10162a] to-sky-500/10 p-5 shadow-xl shadow-black/15">
                    <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-indigo-400/15 blur-3xl transition group-hover:bg-indigo-400/25" />
                    <div className="relative"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400 text-indigo-950"><FlaskConical className="h-5 w-5" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Tournament Lab</p><h3 className="mt-2 text-xl font-black tracking-tight">Turn your collection into a game plan.</h3><p className="mt-2 text-sm leading-6 text-white/45">Test builds, prepare decks, and enter your next event with purpose.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white">Open the lab <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}

          {activeTab === "matchups" ? (
            <motion.div key="matchups" {...reveal} className="grid gap-5 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
              <Panel className="h-fit xl:sticky xl:top-24">
                <SectionHeading eyebrow="Practice desk" title="Log a matchup" description="Capture the exact combination and outcome while it is fresh." icon={<Plus className="h-5 w-5" />} />
                <form className="mt-6 space-y-5" onSubmit={handleSubmitMatchup}>
                  <ComboEditor label="Your combo" accent="indigo" combo={myCombo} onChange={setMyCombo} />
                  <div className="flex items-center gap-3"><span className="h-px flex-1 bg-white/[0.07]" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Versus</span><span className="h-px flex-1 bg-white/[0.07]" /></div>
                  <ComboEditor label="Opponent combo" accent="rose" combo={opponentCombo} onChange={setOpponentCombo} />
                  <fieldset><legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white/40">Result</legend><div className="grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/20 p-1"><button type="button" onClick={() => setResult("win")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${result === "win" ? "bg-emerald-400 text-emerald-950 shadow-lg" : "text-white/40 hover:text-white"}`}><Check className="mr-1.5 inline h-4 w-4" />Win</button><button type="button" onClick={() => setResult("loss")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${result === "loss" ? "bg-rose-400 text-rose-950 shadow-lg" : "text-white/40 hover:text-white"}`}><X className="mr-1.5 inline h-4 w-4" />Loss</button></div></fieldset>
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-400"><Plus className="h-4 w-4" />Add to matchup log</button>
                </form>
              </Panel>

              <Panel>
                <SectionHeading eyebrow="Performance data" title="Matchup log" description={`${wins} wins and ${losses} losses across ${matchups.length} recorded battles.`} icon={<BarChart3 className="h-5 w-5" />} action={<Link to="/profile/matchup-stats" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200">Full analytics <ArrowRight className="h-4 w-4" /></Link>} />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniStat label="Win rate" value={`${winRate}%`} />
                  <MiniStat label="Wins" value={String(wins)} tone="emerald" />
                  <MiniStat label="Losses" value={String(losses)} tone="rose" />
                </div>
                {pagedMatchups.length ? <div className="mt-5 space-y-3">{pagedMatchups.map((matchup) => <MatchupRow key={matchup.id} matchup={matchup} onDelete={() => handleDeleteMatchup(matchup.id)} />)}</div> : <EmptyState icon={<Swords className="h-6 w-6" />} title="No matchups logged" description="Add your first practice result to start building useful performance data." />}
                <Pagination page={page} total={matchups.length} perPage={perPage} onChange={setPage} />
              </Panel>
            </motion.div>
          ) : null}

          {activeTab === "collection" ? (
            <motion.div key="collection" {...reveal}>
              <Panel>
                <SectionHeading eyebrow="Bey locker" title="Your collection" description={`${collectionCount} owned parts ready for deck building and tournament prep.`} icon={<Package className="h-5 w-5" />} action={<Link to="/build-from-my-parts" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400">Build from my parts <ArrowRight className="h-4 w-4" /></Link>} />
                {collectionCount ? (
                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    <PartsGroup title="Blades" caption="Primary attack rings" items={ownedParts.blades} tone="indigo" />
                    <PartsGroup title="Assist blades" caption="CX secondary layers" items={ownedParts.assistBlades || []} tone="sky" />
                    <PartsGroup title="Ratchets" caption="Height and burst profile" items={ownedParts.ratchets} tone="amber" />
                    <PartsGroup title="Bits" caption="Movement and stamina" items={ownedParts.bits} tone="emerald" />
                  </div>
                ) : <EmptyState icon={<Package className="h-6 w-6" />} title="Your Bey locker is empty" description="Add the parts you own, then build tournament decks from your real collection." action={<Link to="/build-from-my-parts" className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white">Add owned parts <ArrowRight className="h-4 w-4" /></Link>} />}
              </Panel>
            </motion.div>
          ) : null}

          {activeTab === "settings" ? (
            <motion.div key="settings" {...reveal} className="grid gap-5 lg:grid-cols-[minmax(280px,.72fr)_minmax(0,1.28fr)]">
              <div className="space-y-5">
                <Panel>
                  <SectionHeading eyebrow="Profile image" title="Your avatar" icon={<Camera className="h-5 w-5" />} />
                  <div className="mt-6 flex flex-col items-center text-center">
                    <img src={avatarDataUrl || "/default-avatar.png"} alt="Profile avatar preview" className="h-32 w-32 rounded-[30px] border border-white/10 object-cover shadow-2xl shadow-black/30" />
                    <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.07] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.11]"><Camera className="h-4 w-4" />Upload new image<input type="file" accept="image/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_500_000) return toast.error("Please choose an image under 2.5 MB."); await handleAvatarChange(await fileToDataUrl(file)); event.target.value = "" }} /></label>
                    {avatarDataUrl ? <button type="button" onClick={() => handleAvatarChange("")} className="mt-2 text-xs font-semibold text-white/35 transition hover:text-rose-300">Remove avatar</button> : null}
                    <p className="mt-4 text-xs leading-5 text-white/30">Square images work best. Maximum file size: 2.5 MB.</p>
                  </div>
                </Panel>

                <Panel>
                  <SectionHeading eyebrow="Live preview" title="Public profile" icon={<ExternalLink className="h-5 w-5" />} />
                  <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4"><p className="text-sm font-bold text-white">metabeys.com{publicPath}</p><p className="mt-2 text-xs leading-5 text-white/35">See exactly what other players can view on your public profile.</p><Link to={publicPath} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200">Open public profile <ExternalLink className="h-4 w-4" /></Link></div>
                </Panel>
              </div>

              <div className="space-y-5">
                <Panel>
                  <SectionHeading eyebrow="Identity" title="Profile details" description="Keep your player bio and home venue up to date." icon={<UserRound className="h-5 w-5" />} />
                  <div className="mt-6 space-y-5">
                    <div><label htmlFor="profile-username" className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Username</label><input id="profile-username" value={displayName} disabled className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-white/35 outline-none" /><p className="mt-2 text-xs text-white/25">Your username is also used in your public profile URL.</p></div>
                    <div><label htmlFor="profile-store" className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Home store</label><div className="relative"><MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-white/25" /><input id="profile-store" value={homeStore} onChange={(event) => setHomeStore(event.target.value)} maxLength={80} placeholder="Where do you usually play?" className="w-full rounded-xl border border-white/[0.09] bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/10" /></div></div>
                    <div><div className="mb-2 flex items-center justify-between"><label htmlFor="profile-bio" className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Bio</label><span className="text-[11px] text-white/25">{bio.length}/280</span></div><textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={5} placeholder="Tell the community about your play style, favorite builds, or goals." className="w-full resize-none rounded-xl border border-white/[0.09] bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/10" /></div>
                    <button type="button" onClick={saveProfile} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-400 sm:w-auto"><Save className="h-4 w-4" />Save profile</button>
                  </div>
                </Panel>

                <Panel>
                  <SectionHeading eyebrow="Session" title="Account access" icon={<ShieldAlert className="h-5 w-5" />} />
                  <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-white">Signed in as {displayName}</p><p className="mt-1 text-xs text-white/35">Sign out safely on this device.</p></div><button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.09]"><LogOut className="h-4 w-4" />Log out</button></div>
                </Panel>

                <section className="overflow-hidden rounded-[24px] border border-rose-400/20 bg-rose-500/[0.055] p-5 sm:p-6">
                  <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-300">Danger zone</p><h2 className="mt-1 text-lg font-black tracking-tight text-white">Delete your account</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Permanently remove your profile, tournament history, matchup data, collection, and all associated account information. This cannot be undone.</p><button type="button" onClick={() => setDeleteModalOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20"><Trash2 className="h-4 w-4" />Delete account</button></div></div>
                </section>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDeleteModal() }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-md rounded-[26px] border border-rose-400/20 bg-[#111522] p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300"><AlertTriangle className="h-5 w-5" /></div><button type="button" onClick={closeDeleteModal} disabled={deletingAccount} aria-label="Close" className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button></div>
            <h2 id="delete-account-title" className="mt-5 text-2xl font-black tracking-tight text-white">Are you absolutely sure?</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">This permanently deletes your MetaBeys account and all information attached to it. There is no recovery option.</p>
            <label htmlFor="delete-confirmation" className="mt-5 block text-xs font-bold uppercase tracking-[0.12em] text-white/45">Type <span className="select-all text-white">{accountUsername}</span> to confirm</label>
            <input id="delete-confirmation" autoFocus value={deleteConfirmation} onChange={(event) => { setDeleteConfirmation(event.target.value); setDeleteError("") }} disabled={deletingAccount} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-rose-400/50 focus:ring-4 focus:ring-rose-500/10" placeholder={accountUsername} />
            {deleteError ? <p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.07] px-3 py-2 text-sm text-rose-200">{deleteError}</p> : null}
            <div className="mt-6 grid gap-2 sm:grid-cols-2"><button type="button" onClick={closeDeleteModal} disabled={deletingAccount} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.09] disabled:opacity-40">Keep my account</button><button type="button" onClick={handleDeleteAccount} disabled={deleteConfirmation.trim() !== accountUsername || deletingAccount} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-35">{deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deletingAccount ? "Deleting…" : "Delete forever"}</button></div>
          </motion.div>
        </div>
      ) : null}
    </main>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-white/[0.08] bg-[#0d111c] p-5 shadow-xl shadow-black/10 sm:p-6 ${className}`}>{children}</section>
}

function SectionHeading({ eyebrow, title, description, icon, action }: { eyebrow: string; title: string; description?: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-400/[0.08] text-indigo-300">{icon}</div><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300/80">{eyebrow}</p><h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>{description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/40">{description}</p> : null}</div></div>{action ? <div className="shrink-0 pl-[52px] sm:pl-0">{action}</div> : null}</div>
}

const metricTones = {
  indigo: "border-indigo-400/15 bg-indigo-400/[0.065] text-indigo-300",
  sky: "border-sky-400/15 bg-sky-400/[0.065] text-sky-300",
  amber: "border-amber-300/15 bg-amber-300/[0.065] text-amber-200",
  emerald: "border-emerald-400/15 bg-emerald-400/[0.065] text-emerald-300",
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: keyof typeof metricTones }) {
  return <article className={`rounded-[22px] border p-5 ${metricTones[tone]}`}><div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/15">{icon}</span></div><p className="mt-5 truncate text-3xl font-black tracking-[-0.04em] text-white">{value}</p><p className="mt-1.5 truncate text-xs text-white/35">{detail}</p></article>
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-300" : tone === "rose" ? "text-rose-300" : "text-white"
  return <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3 text-center"><p className={`text-xl font-black ${color}`}>{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p></div>
}

function TournamentRow({ tournament, onDelete }: { tournament: Tournament; onDelete: () => void }) {
  const eventId = tournament.eventId ?? tournament.id
  return <div className="group flex gap-4 py-4 first:pt-0 last:pb-0"><PlacementMark placement={tournament.placement} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{tournament.storeName || "Tournament"}</h3><PlacementBadge placement={tournament.placement} /></div><p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35"><span>{safeDate(tournament.date)}</span><span>{tournament.totalPlayers || 0} players</span></p></div><p className="shrink-0 text-sm font-black text-white"><span className="text-emerald-300">{tournament.roundWins || 0}W</span><span className="mx-1.5 text-white/20">/</span><span className="text-rose-300">{tournament.roundLosses || 0}L</span></p></div><div className="mt-3 flex items-center gap-3">{eventId ? <Link to={`/events/${eventId}`} className="text-xs font-bold text-indigo-300 transition hover:text-indigo-200">View event</Link> : null}<button type="button" onClick={onDelete} className="text-xs font-semibold text-white/20 transition hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100">Delete record</button></div></div></div>
}

function PlacementMark({ placement }: { placement: string }) {
  const top = placement === "First Place" ? "bg-amber-300/10 text-amber-200 border-amber-300/20" : placement === "Second Place" ? "bg-slate-300/10 text-slate-200 border-slate-300/15" : placement === "Third Place" ? "bg-orange-300/10 text-orange-200 border-orange-300/15" : "bg-indigo-400/[0.07] text-indigo-300 border-indigo-400/15"
  return <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${top}`}><Trophy className="h-5 w-5" /></div>
}

function PlacementBadge({ placement }: { placement: string }) {
  const color = placement === "First Place" ? "bg-amber-300/10 text-amber-200" : placement === "Second Place" ? "bg-slate-300/10 text-slate-200" : placement === "Third Place" ? "bg-orange-300/10 text-orange-200" : placement === "DNQ" ? "bg-rose-300/10 text-rose-200" : "bg-indigo-300/10 text-indigo-200"
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${color}`}>{placement || "Recorded"}</span>
}

function ComboEditor({ label, accent, combo, onChange }: { label: string; accent: "indigo" | "rose"; combo: Combo; onChange: (combo: Combo) => void }) {
  const dot = accent === "indigo" ? "bg-indigo-400" : "bg-rose-400"
  return <fieldset className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-white/50"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${dot}`} />{label}</legend><div className="mt-2 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3"><TextInput label="Blade" value={combo.blade} onChange={(value) => onChange({ ...combo, blade: value })} placeholder="e.g. Wizard Rod" /><TextInput label="Ratchet" value={combo.ratchet} onChange={(value) => onChange({ ...combo, ratchet: value })} placeholder="e.g. 9-60" /><TextInput label="Bit" value={combo.bit} onChange={(value) => onChange({ ...combo, bit: value })} placeholder="e.g. Ball" /></div><div className="mt-3"><TextInput label="Notes (optional)" value={combo.notes || ""} onChange={(value) => onChange({ ...combo, notes: value })} placeholder="Launch, matchup notes, conditions…" /></div></fieldset>
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/[0.08] bg-[#0c101a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-indigo-400/45 focus:ring-4 focus:ring-indigo-500/10" /></label>
}

function MatchupRow({ matchup, onDelete }: { matchup: Matchup; onDelete: () => void }) {
  const won = matchup.result === "win"
  return <article className="group rounded-2xl border border-white/[0.07] bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${won ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{won ? "Win" : "Loss"}</span><button type="button" onClick={onDelete} aria-label="Delete matchup" className="rounded-lg p-1.5 text-white/20 transition hover:bg-rose-400/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><ComboSummary label="Your combo" combo={matchup.myCombo} align="left" /><span className="mx-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/25">VS</span><ComboSummary label="Opponent" combo={matchup.opponentCombo} align="right" /></div></article>
}

function ComboSummary({ label, combo, align }: { label: string; combo: Combo; align: "left" | "right" }) {
  return <div className={align === "right" ? "sm:text-right" : ""}><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/25">{label}</p><p className="mt-1 text-sm font-bold leading-6 text-white">{[combo.blade, combo.ratchet, combo.bit].filter(Boolean).join(" · ") || "Combo unavailable"}</p>{combo.notes ? <p className="mt-1 text-xs leading-5 text-white/30">{combo.notes}</p> : null}</div>
}

const partTones = {
  indigo: "border-indigo-400/15 bg-indigo-400/[0.055] text-indigo-300",
  sky: "border-sky-400/15 bg-sky-400/[0.055] text-sky-300",
  amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  emerald: "border-emerald-400/15 bg-emerald-400/[0.055] text-emerald-300",
}

function PartsGroup({ title, caption, items, tone }: { title: string; caption: string; items: string[]; tone: keyof typeof partTones }) {
  return <section className={`rounded-[20px] border p-4 sm:p-5 ${partTones[tone]}`}><div className="flex items-center justify-between"><div><h3 className="font-black text-white">{title}</h3><p className="mt-1 text-xs text-white/30">{caption}</p></div><span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-black">{items.length}</span></div>{items.length ? <div className="mt-4 flex flex-wrap gap-2">{items.map((item, index) => <span key={`${item}-${index}`} className="rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-white/70">{item}</span>)}</div> : <p className="mt-5 text-sm text-white/25">No parts added yet.</p>}</section>
}

function EmptyState({ icon, title, description, action, compact = false }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; compact?: boolean }) {
  return <div className={`mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 text-center ${compact ? "py-7" : "py-12"}`}><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-white/30">{icon}</div><h3 className="mt-4 text-sm font-bold text-white">{title}</h3><p className="mt-1.5 max-w-sm text-xs leading-5 text-white/35">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>
}

function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  return <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4"><p className="text-xs text-white/30">Page {page} of {totalPages}</p><div className="flex gap-2"><button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/55 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/55 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button></div></div>
}

function safeDate(value?: string) {
  if (!value) return "Date unavailable"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
