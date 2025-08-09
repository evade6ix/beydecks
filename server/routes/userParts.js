// server/routes/userParts.js
import express from "express"
import jwt from "jsonwebtoken"
import { getDb } from "../mongo.js"

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

// --- no-cache helper so responses are always fresh ---
function noStore(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  res.set("Pragma", "no-cache")
  res.set("Expires", "0")
}

// --- tiny auth guard: sets req.user = { id } ---
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ""
  const [scheme, token] = auth.split(" ")
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" })
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
    noStore(res)
    const db = await getDb()
    const users = db.collection("users")
    const user = await users.findOne({ id: req.user.id })
    if (!user) return res.status(404).json({ error: "User not found" })
    res.json({
      blades: user.blades || [],
      ratchets: user.ratchets || [],
      bits: user.bits || [],
      updatedAt: user.partsUpdatedAt || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to load parts" })
  }
})

// shared save handler (PUT/POST behave the same)
async function saveParts(req, res) {
  try {
    const db = await getDb()
    const users = db.collection("users")
    const { blades = [], ratchets = [], bits = [] } = req.body || {}

    const clean = (xs) =>
      Array.isArray(xs)
        ? [...new Set(xs.map((x) => String(x || "").trim()))].filter(Boolean).slice(0, 300)
        : []

    const update = {
      blades: clean(blades),
      ratchets: clean(ratchets),
      bits: clean(bits),
      partsUpdatedAt: new Date(),
    }

    const { value } = await users.findOneAndUpdate(
      { id: req.user.id },
      { $set: update },
      { returnDocument: "after" }
    )
    if (!value) return res.status(404).json({ error: "User not found" })

    noStore(res)
    // return the updated doc so the client reflects server truth immediately
    res.status(200).json({
      blades: value.blades || [],
      ratchets: value.ratchets || [],
      bits: value.bits || [],
      updatedAt: value.partsUpdatedAt || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to save parts" })
  }
}

// PUT and POST both supported
router.put("/parts", requireAuth, saveParts)
router.post("/parts", requireAuth, saveParts)

export default router
