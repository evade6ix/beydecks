// File: server/routes/events.js
import express from "express"
import { getDb } from "../mongo.js"

const router = express.Router()

const norm = (s) => String(s || "").trim().toLowerCase()
const placementForIndex = (i) =>
  i === 0 ? "First Place" : i === 1 ? "Second Place" : i === 2 ? "Third Place" : "Top Cut"

function buildTournamentRow(ev, placement) {
  return {
    eventId: String(ev.id),
    eventTitle: ev.title || "",
    storeName: ev.store || "",
    date: ev.endTime || ev.startTime || new Date().toISOString(),
    totalPlayers: Number(ev.attendeeCount || 0),
    placement,
  }
}

function tally(rows) {
  const list = Array.isArray(rows) ? rows : []
  let firsts = 0, seconds = 0, thirds = 0, topCutCount = 0
  for (const r of list) {
    if (r?.placement === "First Place") firsts++
    else if (r?.placement === "Second Place") seconds++
    else if (r?.placement === "Third Place") thirds++
    if (r?.placement === "Top Cut") topCutCount++
  }
  return { firsts, seconds, thirds, topCutCount }
}


// --- drop-in replacement for syncEventToUsers ---
async function syncEventToUsers(db, _prevEvent, currEvent) {
  if (!currEvent) return

  const Users = db.collection("users")
  const Events = db.collection("events")
  const eventId = String(currEvent.id)

  const norm = (s) => String(s || "").trim().toLowerCase()
  const placementForIndex = (i) =>
    i === 0 ? "First Place" : i === 1 ? "Second Place" : i === 2 ? "Third Place" : "Top Cut"

  function buildTournamentRow(ev, placement) {
    return {
      eventId: String(ev.id),
      eventTitle: ev.title || "",
      storeName: ev.store || "",
      date: ev.endTime || ev.startTime || new Date().toISOString(),
      totalPlayers: Number(ev.attendeeCount || 0),
      placement,
    }
  }

  function tally(rows) {
    const list = Array.isArray(rows) ? rows : []
    let firsts = 0, seconds = 0, thirds = 0, topCutCount = 0
    for (const r of list) {
      if (r?.placement === "First Place") firsts++
      else if (r?.placement === "Second Place") seconds++
      else if (r?.placement === "Third Place") thirds++
      if (r?.placement === "Top Cut") topCutCount++
    }
    return { firsts, seconds, thirds, topCutCount }
  }

  // 1) Verify linkage: only keep slugs where the displayed name still matches that user's username/displayName
  const eventTopCut = Array.isArray(currEvent.topCut) ? currEvent.topCut : []
  const verifiedPlayers = []
  for (let i = 0; i < eventTopCut.length; i++) {
    const p = eventTopCut[i] || {}
    const placement = placementForIndex(i)
    const displayName = norm(p?.name)
    const rawSlug = norm(p?.userSlug || p?.slug)

    if (!rawSlug) {
      verifiedPlayers.push({ slug: null, placement, name: p?.name || "" })
      continue
    }

    const u = await Users.findOne(
      { slug: rawSlug },
      { projection: { username: 1, displayName: 1 } }
    )

    if (!u) {
      // stale slug → unlink
      verifiedPlayers.push({ slug: null, placement, name: p?.name || "" })
      eventTopCut[i] = { ...p, userSlug: null }
      continue
    }

    const uname = norm(u.username)
    const dname = norm(u.displayName)
    // If admin changed the visible name to something different, treat as unlinked
    if (displayName && displayName !== uname && displayName !== dname) {
      verifiedPlayers.push({ slug: null, placement, name: p?.name || "" })
      eventTopCut[i] = { ...p, userSlug: null }
      continue
    }

    verifiedPlayers.push({ slug: rawSlug, placement, name: p?.name || "" })
  }

  // Persist any cleared slugs back to the event (prevents re-adding on next edit)
  try {
    await Events.updateOne({ id: Number(currEvent.id) }, { $set: { topCut: eventTopCut } })
  } catch (_) { /* non-fatal */ }

  // 2) Remove event row from users who should NOT have it anymore
  const currSlugs = new Set(verifiedPlayers.map(p => p.slug).filter(Boolean))
  const toClean = await Users.find(
    { "tournamentsPlayed.eventId": eventId, slug: { $nin: Array.from(currSlugs) } },
    { projection: { _id: 1 } }
  ).toArray()

  if (toClean.length) {
    const ids = toClean.map(u => u._id)
    await Users.updateMany(
      { _id: { $in: ids } },
      { $pull: { tournamentsPlayed: { eventId } } }
    )

    const cursor = Users.find({ _id: { $in: ids } }, { projection: { tournamentsPlayed: 1 } })
    while (await cursor.hasNext()) {
      const u = await cursor.next()
      await Users.updateOne({ _id: u._id }, { $set: tally(u?.tournamentsPlayed) })
    }
  }

  // 3) Upsert/update rows for the CURRENT linked players
  for (const player of verifiedPlayers) {
    if (!player.slug) continue
    const u = await Users.findOne({ slug: player.slug })
    if (!u) continue

    const row = buildTournamentRow(currEvent, player.placement)

    const up = await Users.updateOne(
      { _id: u._id, "tournamentsPlayed.eventId": eventId },
      {
        $set: {
          "tournamentsPlayed.$.eventTitle": row.eventTitle,
          "tournamentsPlayed.$.storeName": row.storeName,
          "tournamentsPlayed.$.date": row.date,
          "tournamentsPlayed.$.totalPlayers": row.totalPlayers,
          "tournamentsPlayed.$.placement": row.placement,
        },
      }
    )

    if (up.matchedCount === 0) {
      await Users.updateOne({ _id: u._id }, { $push: { tournamentsPlayed: row } })
    }

    const fresh = await Users.findOne({ _id: u._id }, { projection: { tournamentsPlayed: 1 } })
    await Users.updateOne({ _id: u._id }, { $set: tally(fresh?.tournamentsPlayed) })
  }
}



router.put("/:id", async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const updatedData = req.body

  try {
    const Events = db.collection("events")
    const eventId = Number(id)

    const prev = await Events.findOne({ id: eventId })
    if (!prev) {
      return res.status(404).json({ error: "Event not found" })
    }

    await Events.updateOne({ id: eventId }, { $set: updatedData })
    const curr = await Events.findOne({ id: eventId })

    try {
      await syncEventToUsers(db, prev, curr)
    } catch (syncErr) {
      console.error("⚠️ syncEventToUsers failed:", syncErr)
    }

    res.json({ success: true })
  } catch (err) {
    console.error("❌ Failed to update event:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
