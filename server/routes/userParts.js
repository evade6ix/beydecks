// server/routes/userParts.js
import express from "express"
import { getDb } from "../mongo.js"
import { requireAuth } from "../middleware/auth.js" // must set req.user.id (string)

const router = express.Router()

// GET /api/me/parts → fetch saved parts for current user
router.get("/parts", requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user.id // ensure your auth middleware sets this
    const doc = await db.collection("user_parts").findOne({ userId: uid })
    res.json({
      blades: doc?.blades ?? [],
      ratchets: doc?.ratchets ?? [],
      bits: doc?.bits ?? [],
      updatedAt: doc?.updatedAt ?? null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to load parts" })
  }
})

// PUT /api/me/parts → save/replace parts for current user
router.put("/parts", requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user.id
    const { blades = [], ratchets = [], bits = [] } = req.body || {}

    await db.collection("user_parts").updateOne(
      { userId: uid },
      {
        $set: {
          userId: uid,
          blades: Array.isArray(blades) ? blades : [],
          ratchets: Array.isArray(ratchets) ? ratchets : [],
          bits: Array.isArray(bits) ? bits : [],
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    res.status(204).end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to save parts" })
  }
})

// (optional) accept POST too, to avoid “Cannot POST /api/me/parts” from any older client
router.post("/parts", requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const uid = req.user.id
    const { blades = [], ratchets = [], bits = [] } = req.body || {}

    await db.collection("user_parts").updateOne(
      { userId: uid },
      {
        $set: {
          userId: uid,
          blades: Array.isArray(blades) ? blades : [],
          ratchets: Array.isArray(ratchets) ? ratchets : [],
          bits: Array.isArray(bits) ? bits : [],
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    res.status(204).end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to save parts" })
  }
})

export default router
