// server/index.js
import express from "express"
import cors from "cors"
import fileUpload from "express-fileupload"
import { join, dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { existsSync, mkdirSync } from "fs"
import { connectDB } from "./mongo.js"
import authRoutes from "./routes/auth.js"
import forumRoutes from "./routes/forum.js"
import eventsRouter from "./routes/events.js"
import userPartsRoutes from "./routes/userParts.js"
import dotenv from "dotenv"
import usersRoutes from "./routes/users.js"
import jwt from "jsonwebtoken" //
import usersLeaderboard from "./routes/users.leaderboard.js"

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 3000

const startServer = async () => {
  console.log("🟢 Starting server...")

  const uploadDir = join(__dirname, "../client/public/uploads")
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  app.options("*", cors())

  app.use(express.json({ limit: "10mb" }))
  app.use(fileUpload())

  app.use("/api", usersLeaderboard)

  // ✅ Connect to DB first
  const { users, products, events, stores, prepDecks } = await connectDB()

  // --- Profile slug support (helper + index + backfill) ---
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

  async function ensureUserSlugIndex() {
    await users.createIndex({ slug: 1 }, { unique: true, sparse: true })
  }

  async function backfillUserSlugs() {
    const cursor = users.find({ $or: [{ slug: { $exists: false } }, { slug: "" }] })
    const toFix = await cursor.toArray()
    for (const u of toFix) {
      const base =
        slugify(u.username) ||
        slugify(u.displayName) ||
        slugify(u.email?.split?.("@")?.[0]) ||
        `user-${String(u._id).slice(-6)}`
      let candidate = base || `user-${String(u._id).slice(-6)}`
      let n = 0
      // eslint-disable-next-line no-await-in-loop
      while (await users.findOne({ slug: candidate, _id: { $ne: u._id } })) {
        n += 1
        candidate = `${base}-${n}`
      }
      await users.updateOne({ _id: u._id }, { $set: { slug: candidate } })
    }
  }

  await ensureUserSlugIndex()
  await backfillUserSlugs()

  // ---------- Inline auth + PATCH /users/me shim (covers both prefixes) ----------
  const publicUserProjection = {
    id: 1,
    _id: 1,
    displayName: 1,
    slug: 1,
    avatarDataUrl: 1,
    bio: 1,
    homeStore: 1,
    ownedParts: 1,
    tournamentsPlayed: 1,
  }

  const getBearerToken = (req) => {
    const h = req.headers.authorization || ""
    return h.startsWith("Bearer ") ? h.slice(7) : null
  }

  const requireAuth = (usersCol) => async (req, res, next) => {
    try {
      const token = getBearerToken(req)
      if (!token) return res.status(401).json({ error: "Missing auth token" })
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const userId = payload?.id || payload?.userId || payload?._id || payload?.sub
      if (!userId) return res.status(401).json({ error: "Invalid token" })
      const idStr = String(userId)
      const me =
        (await usersCol.findOne({ id: idStr })) ||
        (await usersCol.findOne({ _id: idStr })) ||
        (await usersCol.findOne({ _id: userId })) // fallback if _id is ObjectId/other

      if (!me) return res.status(401).json({ error: "User not found" })
      req.me = me
      next()
    } catch {
      return res.status(401).json({ error: "Unauthorized" })
    }
  }

  async function handlePatchMe(req, res) {
    const me = req.me
    const {
      displayName,
      avatarDataUrl,
      bio,
      homeStore,
      ownedParts,
      keepSlug,
    } = req.body || {}

    const $set = {}

    if (typeof displayName === "string" && displayName.trim()) {
      $set.displayName = displayName.trim()
    }

    if (typeof avatarDataUrl === "string") {
      if (avatarDataUrl.startsWith("data:image/") && avatarDataUrl.includes(";base64,")) {
        $set.avatarDataUrl = avatarDataUrl
      } else if (avatarDataUrl === "") {
        $set.avatarDataUrl = ""
      } else {
        return res.status(400).json({ error: "avatarDataUrl must be a base64 data URL" })
      }
    }

    if (typeof bio === "string") $set.bio = bio.slice(0, 500)
    if (typeof homeStore === "string") $set.homeStore = homeStore.slice(0, 120)

    if (ownedParts && typeof ownedParts === "object") {
      const normArr = (a) => (Array.isArray(a) ? a.map(String).slice(0, 300) : [])
      $set.ownedParts = {
        blades: normArr(ownedParts.blades),
        assistBlades: normArr(ownedParts.assistBlades),
        ratchets: normArr(ownedParts.ratchets),
        bits: normArr(ownedParts.bits),
      }
    }

    if ("displayName" in $set && !keepSlug) {
      const base =
        slugify($set.displayName) ||
        slugify(me.email?.split?.("@")?.[0]) ||
        `user-${String(me._id).slice(-6)}`
      let candidate = base || `user-${String(me._id).slice(-6)}`
      let n = 0
      // eslint-disable-next-line no-await-in-loop
      while (await users.findOne({ slug: candidate, _id: { $ne: me._id } })) {
        n += 1
        candidate = `${base}-${n}`
      }
      $set.slug = candidate
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

// build a robust filter
const idStr = String(req.me._id ?? req.me.id ?? "")
const filter = {
  $or: [
    { _id: req.me._id },   // works if ObjectId
    { _id: idStr },        // _id stored as string
    { id: idStr },         // alt id field
  ],
}

// 1) apply update
const upd = await users.updateOne(filter, { $set })

// 2) read back the doc
const u = await users.findOne(filter, { projection: publicUserProjection })
if (!u) {
  console.warn("PATCH /users/me: updated but not found", {
    matched: upd.matchedCount, modified: upd.modifiedCount, filter,
  })
  return res.status(404).json({ error: "User not found" })
}

return res.json({
  id: u.id ?? u._id,
  displayName: u.displayName || "",
  slug: u.slug,
  avatarDataUrl: u.avatarDataUrl || "",
  bio: u.bio || "",
  homeStore: u.homeStore || "",
  ownedParts: u.ownedParts || { blades: [], assistBlades: [], ratchets: [], bits: [] },
})


  }

  // --- Tournament sync helpers (write to tournamentsPlayed + counters) ---
  function placementFromIndex(i) {
    if (i === 0) return "First Place"
    if (i === 1) return "Second Place"
    if (i === 2) return "Third Place"
    return "Top Cut"
  }

  async function recomputeUserCounters(userDoc) {
    const arr = Array.isArray(userDoc.tournamentsPlayed) ? userDoc.tournamentsPlayed : []
    let firsts = 0, seconds = 0, thirds = 0, topCutCount = 0
    for (const t of arr) {
      if (t.placement === "First Place") firsts++
      if (t.placement === "Second Place") seconds++
      if (t.placement === "Third Place") thirds++
      if (["First Place", "Second Place", "Third Place", "Top Cut"].includes(t.placement)) topCutCount++
    }
    await users.updateOne(
      { _id: userDoc._id },
      { $set: { firsts, seconds, thirds, topCutCount } }
    )
  }

  /**
   * Sync an event's topCut into users.tournamentsPlayed.
   * Strategy:
   *  - Find all users currently referencing this eventId -> affectedOld
   *  - $pull that event entry from them
   *  - For each current topCut row with userId/userSlug, push a fresh entry (front) -> affectedNew
   *  - Recompute counters for union(affectedOld, affectedNew)
   */
  async function syncTournamentsForEvent(eventDoc) {
    if (!eventDoc) return
    const eventId = String(eventDoc.id)
    const eventTitle = eventDoc.title || ""
    const date = eventDoc.endTime || eventDoc.startTime || new Date().toISOString()
    const storeName = eventDoc.store || ""
    const totalPlayers = Number(eventDoc.attendeeCount ?? 0)

    // who currently has this event
    const previously = await users.find(
      { "tournamentsPlayed.eventId": eventId },
      { projection: { _id: 1, tournamentsPlayed: 1 } }
    ).toArray()
    const previouslyIds = previously.map(u => u._id)

    // remove from those users
    if (previouslyIds.length) {
      await users.updateMany(
        { _id: { $in: previouslyIds } },
        { $pull: { tournamentsPlayed: { eventId } } }
      )
    }

    // upsert for current top cut
    const topCut = Array.isArray(eventDoc.topCut) ? eventDoc.topCut : []
    const affectedNewIds = []
    for (let i = 0; i < topCut.length; i++) {
      const p = topCut[i] || {}
      const q = p.userId
        ? { $or: [{ id: String(p.userId) }, { _id: String(p.userId) }] }
        : (p.userSlug ? { slug: String(p.userSlug).toLowerCase() } : null)
      if (!q) continue

      const u = await users.findOne(q, { projection: { _id: 1 } })
      if (!u) continue

      const entry = {
        eventId,
        eventTitle,
        storeName,
        date,
        totalPlayers,
        roundWins: typeof p.roundWins === "number" ? p.roundWins : 0,
        roundLosses: typeof p.roundLosses === "number" ? p.roundLosses : 0,
        placement: placementFromIndex(i),
      }

      await users.updateOne(
        { _id: u._id },
        { $push: { tournamentsPlayed: { $each: [entry], $position: 0 } } }
      )
      affectedNewIds.push(u._id)
    }

    // recompute counters for union set
    const unionIds = [...new Set([...previouslyIds, ...affectedNewIds])]
    if (unionIds.length) {
      const docs = await users.find(
        { _id: { $in: unionIds } },
        { projection: { _id: 1, tournamentsPlayed: 1 } }
      ).toArray()
      await Promise.all(docs.map(recomputeUserCounters))
    }
  }

  async function cleanupEventFromAllUsers(eventId) {
    const idStr = String(eventId)
    const targets = await users.find(
      { "tournamentsPlayed.eventId": idStr },
      { projection: { _id: 1, tournamentsPlayed: 1 } }
    ).toArray()

    if (targets.length) {
      await users.updateMany(
        { _id: { $in: targets.map(t => t._id) } },
        { $pull: { tournamentsPlayed: { eventId: idStr } } }
      )
      // recompute counters
      const post = await users.find(
        { _id: { $in: targets.map(t => t._id) } },
        { projection: { _id: 1, tournamentsPlayed: 1 } }
      ).toArray()
      await Promise.all(post.map(recomputeUserCounters))
    }
  }

  // ---------- Auth & Forum ----------
  app.use("/api/auth", authRoutes({ users }))
  app.use("/api/forum", forumRoutes)

  // ---------- Me/Parts (mount on both prefixes) ----------
  app.use("/api/me", userPartsRoutes)
  app.use("/me", userPartsRoutes)

  // ---------- Events router (PUT /:id) on both ----------
  app.use("/api/events", eventsRouter)
  app.use("/events", eventsRouter)

  // ---------- EVENTS CRUD (both /api and non-/api) ----------
  const listEvents = async (_, res) => {
    const data = await events.find().toArray()
    res.json(data)
  }
  const getEvent = async (req, res) => {
    const event = await events.findOne({ id: parseInt(req.params.id) })
    if (!event) return res.status(404).send("Event not found")
    res.json(event)
  }
  const createEvent = async (req, res) => {
    const newEvent = { ...req.body, id: Date.now() }
    await events.insertOne(newEvent)
    // sync user tournaments
    try { await syncTournamentsForEvent(newEvent) } catch (e) { console.warn("Tournament sync (create) failed:", e) }
    res.status(201).json(newEvent)
  }
  const updateEvent = async (req, res) => {
    const idNum = parseInt(req.params.id)
    const result = await events.findOneAndUpdate(
      { id: idNum },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Event not found")
    // sync user tournaments with the updated event
    try { await syncTournamentsForEvent(result.value) } catch (e) { console.warn("Tournament sync (update) failed:", e) }
    res.json(result.value)
  }
  const deleteEvent = async (req, res) => {
    const idNum = parseInt(req.params.id)
    const result = await events.deleteOne({ id: idNum })
    if (result.deletedCount === 0) return res.status(404).send("Event not found")
    // remove references from users
    try { await cleanupEventFromAllUsers(idNum) } catch (e) { console.warn("Tournament cleanup (delete) failed:", e) }
    res.status(204).send()
  }

  app.get("/api/events", listEvents)
  app.get("/api/events/:id", getEvent)
  app.post("/api/events", createEvent)
  app.put("/api/events/:id", updateEvent)
  app.delete("/api/events/:id", deleteEvent)

  app.get("/events", listEvents)
  app.get("/events/:id", getEvent)
  app.post("/events", createEvent)
  app.put("/events/:id", updateEvent)
  app.delete("/events/:id", deleteEvent)

  // ---------- STORES CRUD (both /api and non-/api) ----------
  const listStores = async (_, res) => res.json(await stores.find().toArray())
  const getStore = async (req, res) => {
    const store = await stores.findOne({ id: parseInt(req.params.id) })
    if (!store) return res.status(404).send("Store not found")
    res.json(store)
  }
  const createStore = async (req, res) => {
    const newStore = { ...req.body, id: Date.now() }
    await stores.insertOne(newStore)
    res.status(201).json(newStore)
  }
  const updateStore = async (req, res) => {
    const result = await stores.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Store not found")
    res.json(result.value)
  }
  const deleteStore = async (req, res) => {
    const result = await stores.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Store not found")
    res.status(204).send()
  }

  app.get("/api/stores", listStores)
  app.get("/api/stores/:id", getStore)
  app.post("/api/stores", createStore)
  app.put("/api/stores/:id", updateStore)
  app.delete("/api/stores/:id", deleteStore)

  app.get("/stores", listStores)
  app.get("/stores/:id", getStore)
  app.post("/stores", createStore)
  app.put("/stores/:id", updateStore)
  app.delete("/stores/:id", deleteStore)

  // ---------- PRODUCTS CRUD (both /api and non-/api) ----------
  const listProducts = async (_, res) => res.json(await products.find().toArray())
  const getProduct = async (req, res) => {
    const product = await products.findOne({ id: parseInt(req.params.id) })
    if (!product) return res.status(404).send("Product not found")
    res.json(product)
  }
  const createProduct = async (req, res) => {
    const newProduct = { ...req.body, id: Date.now() }
    await products.insertOne(newProduct)
    res.status(201).json(newProduct)
  }
  const updateProduct = async (req, res) => {
    const result = await products.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Product not found")
    res.json(result.value)
  }
  const deleteProduct = async (req, res) => {
    const result = await products.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Product not found")
    res.status(204).send()
  }

  app.get("/api/products", listProducts)
  app.get("/api/products/:id", getProduct)
  app.post("/api/products", createProduct)
  app.put("/api/products/:id", updateProduct)
  app.delete("/api/products/:id", deleteProduct)

  app.get("/products", listProducts)
  app.get("/products/:id", getProduct)
  app.post("/products", createProduct)
  app.put("/products/:id", updateProduct)
  app.delete("/products/:id", deleteProduct)

  // ---------- Combos & matchups (legacy) ----------
  app.post("/users/:id/combos", async (req, res) => {
    const user = await users.findOne({ id: req.params.id })
    if (!user) return res.status(404).send("User not found")
    const combosSubmitted = user.combosSubmitted || []
    combosSubmitted.push(req.body)
    await users.updateOne({ id: req.params.id }, { $set: { combosSubmitted } })
    res.status(200).json({ message: "Combo saved" })
  })

  app.post("/auth/submit-matchup", async (req, res) => {
    const { userId, yourCombo, opponentCombo, notes, result } = req.body
    const user = await users.findOne({ id: userId })
    if (!user) return res.status(404).send("User not found")
    const matchup = { yourCombo, opponentCombo, notes, result, timestamp: Date.now() }
    const matchupHistory = user.matchupHistory || []
    matchupHistory.push(matchup)
    await users.updateOne({ id: userId }, { $set: { matchupHistory } })
    res.status(200).json({ message: "Matchup saved" })
  })

  app.delete("/auth/delete-matchup", async (req, res) => {
    const { userId, timestamp } = req.body
    const user = await users.findOne({ id: userId })
    if (!user) return res.status(404).send("User not found")
    const updated = (user.matchupHistory || []).filter((m) => m.timestamp !== timestamp)
    if (updated.length === user.matchupHistory?.length) {
      return res.status(404).json({ message: "Matchup not found" })
    }
    await users.updateOne({ id: userId }, { $set: { matchupHistory: updated } })
    res.status(200).json({ message: "Matchup deleted" })
  })

  app.post("/auth/submit-tournament", async (req, res) => {
    const { userId, storeName, date, totalPlayers, roundWins, roundLosses, placement } = req.body
    const user = await users.findOne({ id: userId })
    if (!user) return res.status(404).send("User not found")
    const newTournament = { storeName, date, totalPlayers, roundWins, roundLosses, placement }
    const tournamentsPlayed = user.tournamentsPlayed || []
    tournamentsPlayed.unshift(newTournament)
    await users.updateOne({ id: userId }, { $set: { tournamentsPlayed } })
    res.status(200).json(newTournament)
  })

  // ---------- Prep Decks ----------
  app.post("/api/prep-decks", async (req, res) => {
    const { userId, eventId, combos } = req.body
    if (!userId || !combos || !Array.isArray(combos)) {
      return res.status(400).json({ error: "Missing or invalid data" })
    }
    await prepDecks.insertOne({
      userId,
      eventId: eventId || null,
      combos,
      locked: false,
      createdAt: new Date(),
    })
    res.status(201).json({ message: "Prep deck saved" })
  })

  app.post("/api/prep-decks/analyze", async (req, res) => {
    const { combos } = req.body
    if (!combos || !Array.isArray(combos) || combos.length === 0) {
      return res.status(400).json({ error: "No combos provided" })
    }

    const allEvents = await events.find().toArray()
    const recentEvents = allEvents.filter((event) => !isNaN(new Date(event.startTime)))
    const topCutCombos = []
    for (const event of recentEvents) {
      for (const player of event.topCut || []) {
        for (const combo of player.combos || []) {
          topCutCombos.push({
            combo,
            eventTitle: event.title,
            eventDate: event.startTime || event.date,
          })
        }
      }
    }

    const normalize = (str) => (str || "").toString().trim().toLowerCase()
    const scoredCombos = combos.map((userCombo) => {
      const matches = []
      const seenEvents = new Set()
      let mostRecent = 0
      let firstSeen = Infinity
      let totalScore = 0

      for (const top of topCutCombos) {
        const bladeMatch = normalize(top.combo.blade) === normalize(userCombo.blade)
        const ratchetExact = normalize(top.combo.ratchet) === normalize(userCombo.ratchet)
        const bitMatch = normalize(top.combo.bit) === normalize(userCombo.bit)
        const score = bladeMatch + ratchetExact + bitMatch
        if (score === 3) {
          matches.push({ ...top, similarity: score })
          totalScore += score
          seenEvents.add(top.eventTitle)
          const topDate = new Date(top.eventDate).getTime()
          if (topDate > mostRecent) mostRecent = topDate
          if (topDate < firstSeen) firstSeen = topDate
        }
      }

      const topCutRate = (seenEvents.size / recentEvents.length) * 100
      const avgMatchScore = matches.length > 0 ? (totalScore / matches.length).toFixed(2) : "0.00"
      const scoreCount = { 1: 0, 2: 0, 3: 0 }
      matches.forEach((m) => scoreCount[m.similarity]++)

      return {
        submittedCombo: userCombo,
        topCutAppearances: matches.length,
        matchBreakdown: { "3/3": scoreCount[3], "2/3": scoreCount[2], "1/3": scoreCount[1] },
        uniqueEvents: seenEvents.size,
        topCutRate: topCutRate.toFixed(2) + "%",
        avgMatchScore,
        firstSeen: isFinite(firstSeen) ? new Date(firstSeen).toLocaleDateString() : null,
        mostRecentAppearance: mostRecent ? new Date(mostRecent).toLocaleDateString() : null,
      }
    })

    res.json({ analysis: scoredCombos })
  })

  // ⬇️ Guarantee these two PATCH endpoints exist no matter what
  app.patch("/api/users/me", requireAuth(users), handlePatchMe)
  app.patch("/users/me", requireAuth(users), handlePatchMe)
  console.log("➡️ Mounted PATCH /api/users/me and /users/me")

  // Users router (for other users endpoints like GET by slug)
  app.use("/api/users", usersRoutes({ users }))
  app.use("/users", usersRoutes({ users }))

  // ---------- Static + SPA fallback ----------
  app.use(express.static(join(__dirname, "../client/dist")))
  app.get("*", (req, res) => {
    res.sendFile(resolve(__dirname, "../client/dist/index.html"))
  })

  app.listen(port, () => {
    console.log("✅ Backend + frontend running at: http://localhost:" + port)
  })
}

startServer().catch((err) => {
  console.error("❌ Failed to start:", err)
  process.exit(1)
})
