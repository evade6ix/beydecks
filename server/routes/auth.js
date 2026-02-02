// File: server/routes/auth.js
import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { body, validationResult } from "express-validator"
import crypto from "crypto"

const slugify = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60)

const usernameOk = (s) => /^[a-zA-Z0-9_.]{3,24}$/.test(String(s || ""))

const router = express.Router()
const resetTokens = {}
const JWT_SECRET = process.env.JWT_SECRET

export default (collections) => {
  const users = collections.users

  // --- Register (validates username, ensures uniqueness, and sets a unique slug) ---
  router.post(
    "/register",
    body("username").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    async (req, res) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const { username, email, password } = req.body
      const emailNorm = String(email || "").trim().toLowerCase()

      // Username validation + uniqueness
      if (!usernameOk(username)) {
        return res.status(400).json({
          error: "Username must be 3–24 chars: letters, numbers, underscores, dots.",
        })
      }
      const byUsername = await users.findOne({ username })
      if (byUsername) return res.status(409).json({ error: "Username already taken" })

      // Email uniqueness
      const byEmail = await users.findOne({ email: emailNorm })
      if (byEmail) return res.status(400).json({ error: "User already exists" })

      // Build a unique slug from username
      const base = slugify(username) || `user-${Date.now().toString().slice(-6)}`
      let candidate = base
      let n = 0
      // ensure slug uniqueness
      // eslint-disable-next-line no-await-in-loop
      while (await users.findOne({ slug: candidate })) {
        n += 1
        candidate = `${base}-${n}`
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const user = {
        id: Date.now().toString(),
        username,
        slug: candidate,
        email: emailNorm,
        passwordHash,
        displayName: username,
        profileImage: "",
        tournamentsPlayed: [],
        matchupHistory: [],
        topCutCount: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await users.insertOne(user)
      return res.status(201).json({ message: "Registered" })
    }
  )

  // --- Login ---
  router.post("/login", async (req, res) => {
    const { email, password } = req.body
    const user = await users.findOne({ email: String(email || "").trim().toLowerCase() })
    if (!user) return res.status(401).json({ error: "Invalid credentials" })

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return res.status(401).json({ error: "Invalid credentials" })

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        badge: user.badge || null,
        storeAccess: user.storeAccess || null,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token })
  })

  // --- Forgot Password (mobile-safe: immediate 202 + background email) ---
  router.post("/forgot-password", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase()
    const user = await users.findOne({ email })

    // Respond immediately to avoid mobile timeouts + enumeration
    res.status(202).json({ ok: true, message: "If that email exists, a reset link is on the way." })
    if (!user) return

    // Token in memory (10 min)
    const token = crypto.randomBytes(32).toString("hex")
    resetTokens[token] = { userId: user.id, expires: Date.now() + 10 * 60 * 1000 }

    // Canonical public base URL (pick www or apex in env)
    const PUBLIC_BASE_URL =
      process.env.PUBLIC_BASE_URL ||
      process.env.PUBLIC_WEB_ORIGIN ||
      "https://www.metabeys.com"

    const resetLink = `${PUBLIC_BASE_URL.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`

// Fire-and-forget email via Apps Script webhook (no SMTP)
;(async () => {
  const url = process.env.GMAIL_WEBHOOK_URL
  const token = process.env.GMAIL_WEBHOOK_TOKEN
  if (!url || !token) {
    console.error("❌ Missing GMAIL_WEBHOOK_URL or GMAIL_WEBHOOK_TOKEN")
    return
  }

  const payload = {
    token,
    to: email,
    subject: "Reset your MetaBeys password",
    text: `Hello ${user.username},

Click the link below to reset your password:
${resetLink}

This link will expire in 10 minutes.`,
    html: `<p>Hello ${user.username},</p>
           <p>Click below to reset your password:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>This link will expire in 10 minutes.</p>`,
    fromName: "MetaBeys"
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) throw new Error(`HTTP ${r.status} body=${JSON.stringify(j)}`)
    console.log("✅ Password reset email sent via webhook")
  } catch (e) {
    console.error("❌ Webhook mail failed:", e)
  }
})()



  })

  // --- Reset Password ---
  router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body
    const data = resetTokens[token]
    if (!data || Date.now() > data.expires) {
      return res.status(400).json({ error: "Invalid or expired token" })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await users.updateOne({ id: data.userId }, { $set: { passwordHash } })
    delete resetTokens[token]
    res.json({ message: "Password reset successfully" })
  })

  // --- Me ---
  router.get("/me", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.sendStatus(401)

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)
      const user = await users.findOne({ id: payload.id })
      if (!user) return res.sendStatus(404)

      const { passwordHash, ...safeUser } = user
      res.json(safeUser)
    } catch {
      res.sendStatus(401)
    }
  })

  // --- Update profile ---
  router.patch("/me", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)

      const { displayName, bio, homeStore, avatarDataUrl, ownedParts, slug } = req.body || {}
      const $set = { updatedAt: new Date() }
      if (typeof displayName === "string") $set.displayName = displayName.trim()
      if (typeof bio === "string") $set.bio = bio.slice(0, 500)
      if (typeof homeStore === "string") $set.homeStore = homeStore.slice(0, 120)
      if (typeof avatarDataUrl === "string") $set.avatarDataUrl = avatarDataUrl

      if (ownedParts && typeof ownedParts === "object") {
        const norm = (a) => (Array.isArray(a) ? a.map(String).slice(0, 300) : [])
        $set.ownedParts = {
          blades: norm(ownedParts.blades),
          assistBlades: norm(ownedParts.assistBlades),
          ratchets: norm(ownedParts.ratchets),
          bits: norm(ownedParts.bits),
        }
      }

      if (typeof slug === "string") $set.slug = slug

      const r = await users.updateOne({ id: String(payload.id) }, { $set })
      if (r.matchedCount === 0) return res.status(404).json({ error: "User not found" })

      const updated = await users.findOne(
        { id: String(payload.id) },
        {
          projection: {
            id: 1,
            username: 1,
            displayName: 1,
            slug: 1,
            avatarDataUrl: 1,
            bio: 1,
            homeStore: 1,
            ownedParts: 1,
            tournamentsPlayed: 1,
            matchupHistory: 1,
            topCutCount: 1,
            firsts: 1,
            seconds: 1,
            thirds: 1,
          },
        }
      )

      return res.json(updated)
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  })

  // --- Submit matchup ---
  router.post("/submit-matchup", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)
      const user = await users.findOne({ id: payload.id })
      if (!user) return res.status(404).json({ error: "User not found" })

      const { myCombo, opponentCombo, result } = req.body
      if (!myCombo || !opponentCombo || !["win", "loss"].includes(result)) {
        return res.status(400).json({ error: "Invalid matchup data" })
      }

      const matchup = {
        id: Date.now().toString(),
        myCombo,
        opponentCombo,
        result,
      }

      const matchupHistory = user.matchupHistory || []
      matchupHistory.push(matchup)
      await users.updateOne({ id: payload.id }, { $set: { matchupHistory } })

      res.status(200).json({ message: "Matchup submitted!", matchup })
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  })

  // --- Delete matchup ---
  router.delete("/matchup/:matchupId", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)
      const user = await users.findOne({ id: payload.id })
      if (!user) return res.status(404).json({ error: "User not found" })

      const { matchupId } = req.params
      const updated = (user.matchupHistory || []).filter((m) => m.id !== matchupId)

      if (updated.length === (user.matchupHistory || []).length)
        return res.status(404).json({ error: "Matchup not found" })

      await users.updateOne({ id: payload.id }, { $set: { matchupHistory: updated } })
      res.status(200).json({ message: "Matchup deleted" })
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  })

  // --- Delete tournament ---
  router.delete("/tournament/:index", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)
      const user = await users.findOne({ id: payload.id })
      if (!user) return res.status(404).json({ error: "User not found" })

      const index = parseInt(req.params.index)
      if (isNaN(index) || index < 0 || index >= user.tournamentsPlayed.length) {
        return res.status(400).json({ error: "Invalid index" })
      }

      const updated = [...user.tournamentsPlayed]
      const removed = updated.splice(index, 1)[0]

      if (removed.placement === "First Place") user.firsts = Math.max((user.firsts || 0) - 1, 0)
      if (removed.placement === "Second Place") user.seconds = Math.max((user.seconds || 0) - 1, 0)
      if (removed.placement === "Third Place") user.thirds = Math.max((user.thirds || 0) - 1, 0)
      if (["First Place", "Second Place", "Third Place", "Top Cut"].includes(removed.placement)) {
        user.topCutCount = Math.max((user.topCutCount || 0) - 1, 0)
      }

      await users.updateOne(
        { id: payload.id },
        {
          $set: {
            tournamentsPlayed: updated,
            firsts: user.firsts,
            seconds: user.seconds,
            thirds: user.thirds,
            topCutCount: user.topCutCount,
          },
        }
      )

      res.status(200).json({ message: "Tournament deleted" })
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  })

  // --- Get user by identifier (username/email) ---
  router.get("/user/:identifier", async (req, res) => {
    const { identifier } = req.params
    const user = await users.findOne({
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
      ],
    })
    if (!user) return res.status(404).json({ error: "User not found" })

    const { passwordHash, ...safeUser } = user
    res.json(safeUser)
  })

  // --- Submit tournament ---
  router.post("/submit-tournament", async (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" })

    try {
      const token = auth.split(" ")[1]
      const payload = jwt.verify(token, JWT_SECRET)
      const user = await users.findOne({ id: payload.id })
      if (!user) return res.status(404).json({ error: "User not found" })

      const { storeName, date, totalPlayers, roundWins, roundLosses, placement } = req.body
      if (!storeName || !date || totalPlayers < 0 || roundWins < 0 || roundLosses < 0 || !placement) {
        return res.status(400).json({ error: "Invalid tournament data" })
      }

      const tournament = { storeName, date, totalPlayers, roundWins, roundLosses, placement }
      const tournamentsPlayed = user.tournamentsPlayed || []
      tournamentsPlayed.unshift(tournament)

      if (placement === "First Place") user.firsts = (user.firsts || 0) + 1
      if (placement === "Second Place") user.seconds = (user.seconds || 0) + 1
      if (placement === "Third Place") user.thirds = (user.thirds || 0) + 1
      if (["First Place", "Second Place", "Third Place", "Top Cut"].includes(placement)) {
        user.topCutCount = (user.topCutCount || 0) + 1
      }

      await users.updateOne(
        { id: payload.id },
        {
          $set: {
            tournamentsPlayed,
            firsts: user.firsts,
            seconds: user.seconds,
            thirds: user.thirds,
            topCutCount: user.topCutCount,
          },
        }
      )

      res.status(200).json(tournament)
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  })

  return router
}


