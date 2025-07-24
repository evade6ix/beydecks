import express from "express"
import cors from "cors"
import fileUpload from "express-fileupload"
import { join, dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { existsSync, mkdirSync } from "fs"
import { connectDB } from "./mongo.js"
import authRoutes from "./routes/auth.js"
import dotenv from "dotenv"
import forumRoutes from "./routes/forum.js"
dotenv.config()

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

  app.use("/api/auth", authRoutes({ users }))

  app.use("/api/forum", forumRoutes)

  // === API ROUTES ===

  app.get("/api/events", async (_, res) => {
    const data = await events.find().toArray()
    res.json(data)
  })

  app.get("/api/events/:id", async (req, res) => {
    const event = await events.findOne({ id: parseInt(req.params.id) })
    if (!event) return res.status(404).send("Event not found")
    res.json(event)
  })

  app.post("/api/events", async (req, res) => {
    const newEvent = { ...req.body, id: Date.now() }
    await events.insertOne(newEvent)
    res.status(201).json(newEvent)
  })

  app.put("/api/events/:id", async (req, res) => {
    const result = await events.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Event not found")
    res.json(result.value)
  })

  app.delete("/api/events/:id", async (req, res) => {
    const result = await events.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Event not found")
    res.status(204).send()
  })

  app.get("/api/stores", async (_, res) => {
    const data = await stores.find().toArray()
    res.json(data)
  })

  app.get("/api/stores/:id", async (req, res) => {
    const store = await stores.findOne({ id: parseInt(req.params.id) })
    if (!store) return res.status(404).send("Store not found")
    res.json(store)
  })

  app.post("/api/stores", async (req, res) => {
    const newStore = { ...req.body, id: Date.now() }
    await stores.insertOne(newStore)
    res.status(201).json(newStore)
  })

  app.put("/api/stores/:id", async (req, res) => {
    const result = await stores.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Store not found")
    res.json(result.value)
  })

  app.delete("/api/stores/:id", async (req, res) => {
    const result = await stores.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Store not found")
    res.status(204).send()
  })

  app.get("/api/products", async (_, res) => {
    const data = await products.find().toArray()
    res.json(data)
  })

  app.get("/api/products/:id", async (req, res) => {
    const product = await products.findOne({ id: parseInt(req.params.id) })
    if (!product) return res.status(404).send("Product not found")
    res.json(product)
  })

  app.post("/api/products", async (req, res) => {
    const newProduct = { ...req.body, id: Date.now() }
    await products.insertOne(newProduct)
    res.status(201).json(newProduct)
  })

  app.put("/api/products/:id", async (req, res) => {
    const result = await products.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    )
    if (!result.value) return res.status(404).send("Product not found")
    res.json(result.value)
  })

  app.delete("/api/products/:id", async (req, res) => {
    const result = await products.deleteOne({ id: parseInt(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).send("Product not found")
    res.status(204).send()
  })

  app.post("/api/upload", (req, res) => {
    const file = req.files?.image
    if (!file) return res.status(400).send("No file uploaded")
    const savePath = join(uploadDir, file.name)
    file.mv(savePath, err => {
      if (err) return res.status(500).send("Upload failed")
      res.json({ path: `/uploads/${file.name}` })
    })
  })

  app.post("/users/:id/combos", async (req, res) => {
    const user = await users.findOne({ id: req.params.id })
    if (!user) return res.status(404).send("User not found")
    const combo = req.body
    const combosSubmitted = user.combosSubmitted || []
    combosSubmitted.push(combo)
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
    const updated = (user.matchupHistory || []).filter(m => m.timestamp !== timestamp)
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
    const recentEvents = allEvents.filter(event => !isNaN(new Date(event.startTime)))
    let topCutCombos = []
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

    function normalize(str) {
      return (str || "").toString().trim().toLowerCase()
    }

    const scoredCombos = combos.map(userCombo => {
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
      matches.forEach(m => scoreCount[m.similarity]++)

      return {
        submittedCombo: userCombo,
        topCutAppearances: matches.length,
        matchBreakdown: {
          "3/3": scoreCount[3],
          "2/3": scoreCount[2],
          "1/3": scoreCount[1],
        },
        uniqueEvents: seenEvents.size,
        topCutRate: topCutRate.toFixed(2) + "%",
        avgMatchScore,
        firstSeen: isFinite(firstSeen) ? new Date(firstSeen).toLocaleDateString() : null,
        mostRecentAppearance: mostRecent ? new Date(mostRecent).toLocaleDateString() : null,
      }
    })

    res.json({ analysis: scoredCombos })
  })

  // ✅ SITEMAP ROUTE — must come BEFORE static files
  app.get("/sitemap.xml", async (req, res) => {
    const baseUrl = "https://www.metabeys.com"
    const allEvents = await events.find().toArray()
    const allProducts = await products.find().toArray()
    const allStores = await stores.find().toArray()

    const staticUrls = [
      { loc: "/", priority: 1.0 },
      { loc: "/events", priority: 0.8 },
      { loc: "/shop", priority: 0.8 },
      { loc: "/contact", priority: 0.6 }
    ]

    const eventUrls = allEvents.map(e => ({
      loc: `/events/${e.id}`,
      priority: 0.7
    }))

    const productUrls = allProducts.map(p => ({
      loc: `/shop/${p.id}`,
      priority: 0.7
    }))

    const storeUrls = allStores.flatMap(s => ([
      { loc: `/stores/${s.id}`, priority: 0.6 },
      { loc: `/stores/${s.id}/upcoming`, priority: 0.5 }
    ]))

    const allUrls = [...staticUrls, ...eventUrls, ...productUrls, ...storeUrls]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url><loc>${baseUrl}${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`

    res.header("Content-Type", "application/xml")
    res.send(xml)
  })

  // Serve frontend (AFTER sitemap route)
  app.use(express.static(join(__dirname, "../client/dist")))
  app.get("*", (req, res) => {
    res.sendFile(resolve(__dirname, "../client/dist/index.html"))
  })

  app.listen(port, () => {
    console.log("✅ Backend + frontend running at: http://localhost:" + port)
  })
}

startServer().catch(err => {
  console.error("❌ Failed to start:", err)
  process.exit(1)
})


