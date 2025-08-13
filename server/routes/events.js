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


// --- replace your syncEventToUsers with this ---
async function syncEventToUsers(db, _prevEvent, currEvent) {
  if (!currEvent) return

  const Users = db.collection("users")
  const eventId = String(currEvent.id)

  // Build the *current* set of slugs that should have this event on their profile
  const currPlayers = (currEvent?.topCut || []).map((p, i) => ({
    slug: norm(p?.userSlug || p?.slug),   // support both fields
    placement: placementForIndex(i),
    name: p?.name || "",
  }))
  const currSlugs = new Set(currPlayers.map(p => p.slug).filter(Boolean))

  // 1) Remove the event row from users who SHOULD NOT have it anymore
  //    (i.e., anyone who currently has tournamentsPlayed.eventId == eventId but whose slug is not in currSlugs)
  const slugsArray = Array.from(currSlugs)
  const toClean = await Users
    .find({ "tournamentsPlayed.eventId": eventId, slug: { $nin: slugsArray } }, { projection: { _id: 1 } })
    .toArray()

  if (toClean.length) {
    const ids = toClean.map(u => u._id)
    await Users.updateMany(
      { _id: { $in: ids } },
      { $pull: { tournamentsPlayed: { eventId } } }
    )
    // Recompute counters for the affected users
    const cursor = Users.find({ _id: { $in: ids } }, { projection: { tournamentsPlayed: 1 } })
    while (await cursor.hasNext()) {
      const u = await cursor.next()
      const counts = tally(u?.tournamentsPlayed)
      await Users.updateOne({ _id: u._id }, { $set: counts })
    }
  }

  // 2) Upsert/update rows for the current players
  for (const player of currPlayers) {
    if (!player.slug) continue
    const u = await Users.findOne({ slug: player.slug })
    if (!u) continue

    const row = buildTournamentRow(currEvent, player.placement)

    // Update existing row by eventId (don't touch roundWins/roundLosses)
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

    // If none existed, push a new one
    if (up.matchedCount === 0) {
      await Users.updateOne({ _id: u._id }, { $push: { tournamentsPlayed: row } })
    }

    // Recompute counters for this user
    const fresh = await Users.findOne({ _id: u._id }, { projection: { tournamentsPlayed: 1 } })
    const counts = tally(fresh?.tournamentsPlayed)
    await Users.updateOne({ _id: u._id }, { $set: counts })
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
