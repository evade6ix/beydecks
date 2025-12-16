import express from "express"

export default function eventSubmissionsRoutes({ eventSubmissions }) {
  const router = express.Router()

  // GET /api/event-submissions (and /event-submissions via the extra mount)
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

      // Minimal validation (no guessing)
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

        // EXACT same shape as Admin POST /events payload
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

  return router
}
