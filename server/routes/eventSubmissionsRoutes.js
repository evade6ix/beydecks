// server/routes/eventSubmissionsRoutes.js
import express from "express"
import { ObjectId } from "mongodb"

export default function eventSubmissionsRoutes({ eventSubmissions }) {
  const router = express.Router()

  // GET /api/event-submissions
  router.get("/", async (req, res) => {
    try {
      const items = await eventSubmissions
        .find({})
        .sort({ submittedAt: -1 })
        .toArray()

      return res.json(items)
    } catch (err) {
      console.error("GET /api/event-submissions error:", err)
      return res.status(500).json({ error: "Server error" })
    }
  })

  // POST /api/event-submissions
  router.post("/", async (req, res) => {
    try {
      const {
        title,
        startTime,
        endTime,
        store,
        topCut,
        buyLink,
        imageUrl,
        capacity,
        attendeeCount,
        country,
        region,
        city,
        challongeUrl,
      } = req.body || {}

      if (!title || !startTime || !endTime || !store) {
        return res.status(400).json({
          error: "Missing required fields: title, startTime, endTime, store",
        })
      }

      const doc = {
        status: "pending",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        eventDraft: {
          title,
          startTime,
          endTime,
          store,
          topCut: Array.isArray(topCut) ? topCut : [],
          buyLink: buyLink || "",
          imageUrl: imageUrl || "",
          capacity: typeof capacity === "number" ? capacity : undefined,
          attendeeCount: typeof attendeeCount === "number" ? attendeeCount : undefined,
          country: country || "",
          region: region || "",
          city: city || "",
          challongeUrl: challongeUrl || undefined,
        },
      }

      const result = await eventSubmissions.insertOne(doc)
      return res.json({ ok: true, id: String(result.insertedId) })
    } catch (err) {
      console.error("POST /api/event-submissions error:", err)
      return res.status(500).json({ error: "Server error" })
    }
  })

  // DELETE /api/event-submissions/:id  (Reject = hard delete)
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params

      const result = await eventSubmissions.findOneAndDelete({
        _id: new ObjectId(id),
      })

      if (!result.value) {
        return res.status(404).json({ error: "Submission not found" })
      }

      return res.json({ ok: true, deletedId: id })
    } catch (err) {
      console.error("DELETE /api/event-submissions error:", err)
      return res.status(500).json({ error: "Server error" })
    }
  })

  return router
}
