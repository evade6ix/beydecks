import express from "express"
import { getDb } from "../mongo.js"

const router = express.Router()

// UPDATE an event
router.put("/:id", async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const updatedData = req.body

  try {
    await db.collection("events").updateOne(
      { id: Number(id) },
      { $set: updatedData }
    )
    res.json({ success: true })
  } catch (err) {
    console.error("❌ Failed to update event:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
