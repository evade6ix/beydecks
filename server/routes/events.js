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


async function syncEventToUsers(db, prevEvent, currEvent) {
  if (!currEvent) return

  const Users = db.collection("users")
  const eventId = String(currEvent.id)

  const prevSlugs = new Set(
    (prevEvent?.topCut || []).map((p) => norm(p?.userSlug)).filter(Boolean)
  )

  const currPlayers = (currEvent?.topCut || []).map((p, i) => ({
    slug: norm(p?.userSlug),
    placement: placementForIndex(i),
    name: p?.name || "",
  }))
  const currSlugs = new Set(currPlayers.map((p) => p.slug).filter(Boolean))

  for (const slug of prevSlugs) {
    if (!slug || currSlugs.has(slug)) continue
    const u = await Users.findOne({ slug })
    if (!u) continue
    await Users.updateOne({ _id: u._id }, { $pull: { tournamentsPlayed: { eventId } } })
    const fresh = await Users.findOne({ _id: u._id }, { projection: { tournamentsPlayed: 1 } })
    const counts = tally(fresh?.tournamentsPlayed)
    await Users.updateOne({ _id: u._id }, { $set: counts })
  }

  for (const player of currPlayers) {
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
