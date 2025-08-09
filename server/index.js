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
import dotenv from "dotenv"
import eventsRouter from "./routes/events.js"

dotenv.config()

function getUserIdFromAuth(req) {
  const header = req.headers.authorization || ""
  const [scheme, token] = header.split(" ")
  if (scheme !== "Bearer" || !token) return null
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = Buffer.from(payloadB64, "base64").toString("utf8")
    const payload = JSON.parse(json)
    return payload.sub || payload.id || payload.userId || payload.user?.id || null
  } catch {
    return null
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 3000

const startServer = async () => {
  console.log("🟢 Starting server...")

  const uploadDir = join(__dirname, "../client/public/uploads")
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

  app.use(cors())
  app.use(express.json({ limit: "10mb" }))
  app.use(fileUpload())

  const { users, products, events, stores, prepDecks } = await connectDB()

  // ---------- /me/parts (both with and without /api) ----------
  const getMeParts = async (req, res) => {
    const userId = getUserIdFromAuth(req)
    if (!userId) return res.status(401).json({ error: "Not logged in" })

    const idNum = Number(userId)
    const query = Number.isFinite(idNum)
      ? { $or: [{ id: idNum }, { id: String(userId) }] }
      : { id: String(userId) }

    const user = await users.findOne(query)
    if (!user) return res.status(404).json({ error: "User not found" })

    res.json({
      blades: user.blades || [],
      ratchets: user.ratchets || [],
      bits: user.bits || [],
      partsUpdatedAt: user.partsUpdatedAt || null,
    })
  }

  const putMeParts = async (req, res) => {
    try {
      const userId = getUserIdFromAuth(req)
      if (!userId) return res.status(401).json({ error: "Not logged in" })

      const idNum = Number(userId)
      const query = Number.isFinite(idNum)
        ? { $or: [{ id: idNum }, { id: String(userId) }] }
        : { id: String(userId) }

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

      const result = await users.findOneAndUpdate(query, { $set: update }, { returnDocument: "after" })
      if (!result.value) return res.status(404).json({ error: "User not found" })

      res.status(204).send()
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Failed to save parts" })
    }
  }

  app.get("/api/me/parts", getMeParts)
  app.put("/api/me/parts", putMeParts)
  app.get("/me/parts", getMeParts)   // alias (no /api)
  app.put("/me/parts", putMeParts)   // alias (no /api)

  // ---------- Auth & Forum routers ----------
  app.use("/api/auth", authRoutes({ users }))
  app.use("/api/forum", forumRoutes)

  // ---------- Events router (mount on both /api/events and /events) ----------
  app.use("/api/events", eventsRouter)
  app.use("/events", eventsRouter)

  // ---------- EVENTS CRUD (duplicate on both paths so old/new clients work) ----------
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
    res.status(201).json(newEvent)
  }
  const updateEvent = async (req, res) => {
    const result = await events.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Event not found")
    res.json(result.value)
  }
  const deleteEvent = async (req, res) => {
    const result = await events.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Event not found")
    res.status(204).send()
  }

  app.get("/api/events", listEvents)
  app.get("/api/events/:id", getEvent)
  app.post("/api/events", createEvent)
  app.put("/api/events/:id", updateEvent)
  app.delete("/api/events/:id", deleteEvent)

  app.get("/events", listEvents)            // alias (no /api)
  app.get("/events/:id", getEvent)          // alias (no /api)
  app.post("/events", createEvent)          // alias (no /api)
  app.put("/events/:id", updateEvent)       // alias (no /api)
  app.delete("/events/:id", deleteEvent)    // alias (no /api)

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

  app.get("/stores", listStores)              // alias (no /api)
  app.get("/stores/:id", getStore)            // alias (no /api)
  app.post("/stores", createStore)            // alias (no /api)
  app.put("/stores/:id", updateStore)         // alias (no /api)
  app.delete("/stores/:id", deleteStore)      // alias (no /api)

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

  app.get("/products", listProducts)              // alias (no /api)
  app.get("/products/:id", getProduct)            // alias (no /api)
  app.post("/products", createProduct)            // alias (no /api)
  app.put("/products/:id", updateProduct)         // alias (no /api)
  app.delete("/products/:id", deleteProduct)      // alias (no /api)

  // ---------- Combos & matchups (legacy routes, leave as-is) ----------
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
