// server/routes/userParts.js
import express from "express"
import jwt from "jsonwebtoken"
import { getDb } from "../mongo.js"

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

// Simple auth guard: sets req.user = { id }
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ""
  const [scheme, token] = auth.split(" ")
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (!payload?.id) return res.status(401).json({ error: "Invalid token" })
    req.user = { id: String(payload.id) }
    next()
  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}

// GET /me/parts
router.get("/parts", requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const users = db.collection("users")
    const user = await users.findOne({ id: String(req.user.id) })
    if (!user) return res.status(404).json({ error: "User not found" })
    const legacy = user.ownedParts || {}
    const parts = (key) => {
      const current = user[key]
      if (Array.isArray(current) && current.length) return current
      return Array.isArray(legacy[key]) ? legacy[key] : Array.isArray(current) ? current : []
    }
    res.json({
      blades: parts("blades"),
      assistBlades: parts("assistBlades"),
      ratchets: parts("ratchets"),
      bits: parts("bits"),
      updatedAt: user.partsUpdatedAt || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to load parts" })
  }
})

// Shared save handler for PUT/POST
async function saveParts(req, res) {
  try {
    const db = await getDb()
    const users = db.collection("users")
    const { blades = [], assistBlades, ratchets = [], bits = [] } = req.body || {}

    const clean = (xs) =>
      Array.isArray(xs)
        ? [...new Set(xs.map((x) => String(x || "").trim()))]
            .filter(Boolean)
            .slice(0, 300)
        : []

    const user = await users.findOne({ id: String(req.user.id) })
    if (!user) return res.status(404).json({ error: "User not found" })

    // Preserve Assist Blades for older clients that do not send the new field yet.
    const cleanedAssistBlades = Array.isArray(assistBlades)
      ? clean(assistBlades)
      : clean(user.assistBlades || user.ownedParts?.assistBlades || [])
    const cleanedParts = {
      blades: clean(blades),
      assistBlades: cleanedAssistBlades,
      ratchets: clean(ratchets),
      bits: clean(bits),
    }

    const updateDoc = {
      $set: {
        ...cleanedParts,
        ownedParts: cleanedParts,
        partsUpdatedAt: new Date(),
      },
    }

    await users.updateOne({ id: String(req.user.id) }, updateDoc)

    return res.status(204).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to save parts" })
  }
}

// PUT and (compat) POST
router.put("/parts", requireAuth, saveParts)
router.post("/parts", requireAuth, saveParts)

export default router
