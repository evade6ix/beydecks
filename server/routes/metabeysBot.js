import express from "express"
import jwt from "jsonwebtoken"

const CACHE_TTL_MS = 5 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 40

const norm = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

const searchable = (value) =>
  norm(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const comboKey = (combo) =>
  [combo.blade, combo.assistBlade || "", combo.ratchet, combo.bit].map(norm).join("|")

const bladeConfigKey = (blade, assistBlade = "") => [blade, assistBlade].map(norm).join("|")

const timestampFor = (value) => {
  const timestamp = new Date(value || 0).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const eventTimestamp = (event) =>
  timestampFor(event.endTime || event.startTime || event.date || event.createdAt)

const daysSince = (value) => {
  const timestamp = timestampFor(value)
  if (!timestamp) return Infinity
  return Math.max(0, (Date.now() - timestamp) / 86_400_000)
}

const decayFromDays = (days, lambda = 60) =>
  Number.isFinite(days) ? Math.exp(-days / lambda) : 0

const clamp01 = (value) => Math.max(0, Math.min(1, value))

const percentile = (values, percentileValue) => {
  if (!values.length) return 1
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((percentileValue / 100) * (sorted.length - 1)))
  )
  return Math.max(1, sorted[index])
}

const mean = (values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0

const harmonicMean = (values) => {
  const denominator = values.reduce((total, value) => total + (value > 0 ? 1 / value : 0), 0)
  return values.length && denominator > 0 ? values.length / denominator : 0
}

const gradeLetter = (score) =>
  score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D"

function gradeDeck(deck, appearanceBaseline) {
  const p95 = Math.max(1, percentile(appearanceBaseline, 95))
  const recencies = []
  const comboScores = []

  for (const combo of deck) {
    const appearances = Math.max(0, Number(combo.appearances || 0))
    const strength = Math.pow(Math.min(appearances / p95, 1), 0.6) * 100
    const recency = decayFromDays(daysSince(combo.mostRecentAppearance), 75) * 100
    recencies.push(recency)
    comboScores.push(0.7 * strength + 0.3 * recency)
  }

  const strength = 0.6 * Math.min(...comboScores) + 0.4 * mean(comboScores)
  const recency = harmonicMean(recencies)
  const parts = deck
    .flatMap((combo) => [combo.blade, combo.assistBlade, combo.ratchet, combo.bit])
    .filter(Boolean)
    .map(norm)
  const diversity = Math.round((new Set(parts).size / Math.max(1, parts.length)) * 100)

  let score = Math.round(0.6 * strength + 0.25 * recency + 0.15 * diversity)
  const hasZeroAppearances = deck.some((combo) => Number(combo.appearances || 0) === 0)
  const hasLowAppearances = deck.some((combo) => Number(combo.appearances || 0) < 2)
  const hasStaleCombo = deck.some((combo) => daysSince(combo.mostRecentAppearance) > 180)

  let cap = 100
  if (hasZeroAppearances) cap = Math.min(cap, 70)
  else if (hasLowAppearances) cap = Math.min(cap, 85)
  if (hasStaleCombo) cap = Math.min(cap, 80)
  score = Math.min(score, cap)

  return {
    score,
    letter: gradeLetter(score),
    components: {
      strength: Math.round(strength),
      recency: Math.round(recency),
      diversity,
    },
  }
}

function noOverlap(existing, next) {
  const used = {
    blades: new Set(existing.map((combo) => norm(combo.blade))),
    assistBlades: new Set(existing.map((combo) => norm(combo.assistBlade)).filter(Boolean)),
    ratchets: new Set(existing.map((combo) => norm(combo.ratchet))),
    bits: new Set(existing.map((combo) => norm(combo.bit))),
  }

  return (
    !used.blades.has(norm(next.blade)) &&
    (!next.assistBlade || !used.assistBlades.has(norm(next.assistBlade))) &&
    !used.ratchets.has(norm(next.ratchet)) &&
    !used.bits.has(norm(next.bit))
  )
}

function scoreSingleCombo(combo, appearanceBaseline) {
  const p95 = percentile(appearanceBaseline, 95)
  const strength = clamp01(Number(combo.appearances || 0) / Math.max(1, p95))
  const recency = decayFromDays(daysSince(combo.mostRecentAppearance), 60)
  return 0.7 * strength + 0.3 * recency
}

function findBestDecks(candidates, appearanceBaseline, limit = 3) {
  if (candidates.length < 3) return []
  const scored = candidates
    .map((combo) => ({ combo, score: scoreSingleCombo(combo, appearanceBaseline) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 72)

  const decks = []
  for (let first = 0; first < scored.length; first += 1) {
    const comboOne = scored[first].combo
    for (let second = first + 1; second < scored.length; second += 1) {
      const comboTwo = scored[second].combo
      if (!noOverlap([comboOne], comboTwo)) continue
      for (let third = second + 1; third < scored.length; third += 1) {
        const comboThree = scored[third].combo
        if (!noOverlap([comboOne, comboTwo], comboThree)) continue
        const combos = [comboOne, comboTwo, comboThree]
        decks.push({ combos, grade: gradeDeck(combos, appearanceBaseline) })
      }
    }
  }

  const seen = new Set()
  return decks
    .sort((a, b) => b.grade.score - a.grade.score)
    .filter((deck) => {
      const signature = deck.combos.map(comboKey).sort().join("·")
      if (seen.has(signature)) return false
      seen.add(signature)
      return true
    })
    .slice(0, limit)
}

function addCatalogPart(catalogMap, frequencyMap, value) {
  const key = norm(value)
  if (!key) return
  frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1)
  if (!catalogMap.has(key)) catalogMap.set(key, String(value).trim())
}

function buildSnapshot(eventDocuments) {
  const catalogs = {
    blades: new Map(),
    assistBlades: new Map(),
    ratchets: new Map(),
    bits: new Map(),
  }
  const frequencies = {
    blades: new Map(),
    assistBlades: new Map(),
    ratchets: new Map(),
    bits: new Map(),
  }
  const comboMap = new Map()
  const bladeConfigFrequency = new Map()
  const bladeRatchetFrequency = new Map()
  const bladeBitFrequency = new Map()

  for (const event of eventDocuments) {
    const date = event.endTime || event.startTime || event.date
    for (const player of event.topCut || []) {
      for (const combo of player.combos || []) {
        const blade = String(combo?.blade || "").trim()
        const assistBlade = String(combo?.assistBlade || "").trim()
        const ratchet = String(combo?.ratchet || "").trim()
        const bit = String(combo?.bit || "").trim()
        if (!blade || !ratchet || !bit) continue

        addCatalogPart(catalogs.blades, frequencies.blades, blade)
        if (assistBlade) addCatalogPart(catalogs.assistBlades, frequencies.assistBlades, assistBlade)
        addCatalogPart(catalogs.ratchets, frequencies.ratchets, ratchet)
        addCatalogPart(catalogs.bits, frequencies.bits, bit)

        const configurationKey = bladeConfigKey(blade, assistBlade)
        bladeConfigFrequency.set(
          configurationKey,
          (bladeConfigFrequency.get(configurationKey) || 0) + 1
        )
        const bladeRatchetKey = `${configurationKey}|${norm(ratchet)}`
        const bladeBitKey = `${configurationKey}|${norm(bit)}`
        bladeRatchetFrequency.set(
          bladeRatchetKey,
          (bladeRatchetFrequency.get(bladeRatchetKey) || 0) + 1
        )
        bladeBitFrequency.set(bladeBitKey, (bladeBitFrequency.get(bladeBitKey) || 0) + 1)

        const exactCombo = { blade, assistBlade: assistBlade || undefined, ratchet, bit }
        const key = comboKey(exactCombo)
        const record = comboMap.get(key) || {
          ...exactCombo,
          appearances: 0,
          mostRecentAppearance: undefined,
        }
        record.appearances += 1
        if (
          date &&
          (!record.mostRecentAppearance || timestampFor(date) > timestampFor(record.mostRecentAppearance))
        ) {
          record.mostRecentAppearance = date
        }
        comboMap.set(key, record)
      }
    }
  }

  const sortedCatalog = (category) =>
    [...catalogs[category].entries()]
      .sort((a, b) => (frequencies[category].get(b[0]) || 0) - (frequencies[category].get(a[0]) || 0))
      .map(([, value]) => value)

  const completedEvents = eventDocuments
    .filter((event) => Array.isArray(event.topCut) && event.topCut.length > 0)
    .filter((event) => eventTimestamp(event) <= Date.now() || eventTimestamp(event) === 0)
    .sort((a, b) => eventTimestamp(b) - eventTimestamp(a))

  const combos = [...comboMap.values()].sort((a, b) => b.appearances - a.appearances)
  return {
    completedEvents,
    latestEvent: completedEvents[0] || null,
    combos,
    appearanceBaseline: combos.map((combo) => combo.appearances),
    catalogs: {
      blades: sortedCatalog("blades"),
      assistBlades: sortedCatalog("assistBlades"),
      ratchets: sortedCatalog("ratchets"),
      bits: sortedCatalog("bits"),
    },
    catalogMaps: catalogs,
    frequencies,
    bladeConfigFrequency,
    bladeRatchetFrequency,
    bladeBitFrequency,
  }
}

function matchesFromCatalog(message, values) {
  const haystack = ` ${searchable(message)} `
  const occupied = []
  const matches = []

  for (const value of [...values].sort((a, b) => searchable(b).length - searchable(a).length)) {
    const needle = searchable(value)
    if (!needle) continue
    let from = 0
    let index = haystack.indexOf(` ${needle} `, from)
    while (index !== -1) {
      const start = index + 1
      const end = start + needle.length
      const overlaps = occupied.some((range) => start < range.end && end > range.start)
      if (!overlaps) {
        matches.push(value)
        occupied.push({ start, end })
        break
      }
      from = end
      index = haystack.indexOf(` ${needle} `, from)
    }
  }

  return matches
}

function extractParts(message, snapshot) {
  return {
    blades: matchesFromCatalog(message, snapshot.catalogs.blades),
    assistBlades: matchesFromCatalog(message, snapshot.catalogs.assistBlades),
    ratchets: matchesFromCatalog(message, snapshot.catalogs.ratchets),
    bits: matchesFromCatalog(message, snapshot.catalogs.bits),
  }
}

function cleanPartContext(parts, snapshot) {
  const canonicalize = (category, values) => {
    const catalog = snapshot.catalogMaps[category]
    return [...new Set((Array.isArray(values) ? values : []).map((value) => catalog.get(norm(value))).filter(Boolean))]
      .slice(0, 100)
  }
  return {
    blades: canonicalize("blades", parts?.blades),
    assistBlades: canonicalize("assistBlades", parts?.assistBlades),
    ratchets: canonicalize("ratchets", parts?.ratchets),
    bits: canonicalize("bits", parts?.bits),
  }
}

function mergeParts(...collections) {
  const mergeCategory = (category) =>
    [...new Map(collections.flatMap((parts) => parts?.[category] || []).map((value) => [norm(value), value])).values()]
  return {
    blades: mergeCategory("blades"),
    assistBlades: mergeCategory("assistBlades"),
    ratchets: mergeCategory("ratchets"),
    bits: mergeCategory("bits"),
  }
}

const partCount = (parts) =>
  parts.blades.length + parts.assistBlades.length + parts.ratchets.length + parts.bits.length

function orderOwned(values, frequencyMap) {
  return [...values].sort((a, b) => (frequencyMap.get(norm(b)) || 0) - (frequencyMap.get(norm(a)) || 0))
}

function fabricateCandidates(parts, snapshot) {
  const owned = {
    blades: new Set(parts.blades.map(norm)),
    assistBlades: new Set(parts.assistBlades.map(norm)),
    ratchets: new Set(parts.ratchets.map(norm)),
    bits: new Set(parts.bits.map(norm)),
  }
  const bladeOrder = orderOwned(parts.blades, snapshot.frequencies.blades).slice(0, 24)
  const assistOrder = orderOwned(parts.assistBlades, snapshot.frequencies.assistBlades)
  const ratchetOrder = orderOwned(parts.ratchets, snapshot.frequencies.ratchets).slice(0, 20)
  const bitOrder = orderOwned(parts.bits, snapshot.frequencies.bits).slice(0, 20)
  const candidates = []
  const seen = new Set()

  for (const blade of bladeOrder) {
    if (!owned.blades.has(norm(blade))) continue
    const configurations = []
    const regularFrequency = snapshot.bladeConfigFrequency.get(bladeConfigKey(blade)) || 0
    if (regularFrequency > 0) configurations.push({ frequency: regularFrequency })
    for (const assistBlade of assistOrder) {
      if (!owned.assistBlades.has(norm(assistBlade))) continue
      const frequency = snapshot.bladeConfigFrequency.get(bladeConfigKey(blade, assistBlade)) || 0
      if (frequency > 0) configurations.push({ assistBlade, frequency })
    }

    for (const configuration of configurations.sort((a, b) => b.frequency - a.frequency).slice(0, 6)) {
      const configKey = bladeConfigKey(blade, configuration.assistBlade)
      const ratchets = ratchetOrder
        .filter((ratchet) => owned.ratchets.has(norm(ratchet)))
        .sort(
          (a, b) =>
            (snapshot.bladeRatchetFrequency.get(`${configKey}|${norm(b)}`) || 0) -
            (snapshot.bladeRatchetFrequency.get(`${configKey}|${norm(a)}`) || 0)
        )
        .slice(0, 6)
      const bits = bitOrder
        .filter((bit) => owned.bits.has(norm(bit)))
        .sort(
          (a, b) =>
            (snapshot.bladeBitFrequency.get(`${configKey}|${norm(b)}`) || 0) -
            (snapshot.bladeBitFrequency.get(`${configKey}|${norm(a)}`) || 0)
        )
        .slice(0, 6)

      for (const ratchet of ratchets) {
        for (const bit of bits) {
          const combo = { blade, assistBlade: configuration.assistBlade, ratchet, bit }
          const key = comboKey(combo)
          if (seen.has(key)) continue
          seen.add(key)
          const pairScore =
            (snapshot.bladeRatchetFrequency.get(`${configKey}|${norm(ratchet)}`) || 0) +
            (snapshot.bladeBitFrequency.get(`${configKey}|${norm(bit)}`) || 0)
          const popularity =
            (snapshot.frequencies.blades.get(norm(blade)) || 0) +
            (configuration.assistBlade
              ? snapshot.frequencies.assistBlades.get(norm(configuration.assistBlade)) || 0
              : 0) +
            (snapshot.frequencies.ratchets.get(norm(ratchet)) || 0) +
            (snapshot.frequencies.bits.get(norm(bit)) || 0)
          candidates.push({
            ...combo,
            appearances: Math.round(0.6 * pairScore + 0.4 * (popularity / 10)),
            mostRecentAppearance: undefined,
            fabricated: true,
          })
        }
      }
    }
  }

  return candidates.sort((a, b) => b.appearances - a.appearances).slice(0, 220)
}

function suggestUpgrades(parts, snapshot) {
  const owned = {
    blades: new Set(parts.blades.map(norm)),
    assistBlades: new Set(parts.assistBlades.map(norm)),
    ratchets: new Set(parts.ratchets.map(norm)),
    bits: new Set(parts.bits.map(norm)),
  }
  let best = null
  for (const combo of snapshot.combos.slice(0, 150)) {
    const missing = []
    if (!owned.blades.has(norm(combo.blade))) missing.push({ category: "Blade", name: combo.blade })
    if (combo.assistBlade && !owned.assistBlades.has(norm(combo.assistBlade))) {
      missing.push({ category: "Assist Blade", name: combo.assistBlade })
    }
    if (!owned.ratchets.has(norm(combo.ratchet))) missing.push({ category: "Ratchet", name: combo.ratchet })
    if (!owned.bits.has(norm(combo.bit))) missing.push({ category: "Bit", name: combo.bit })
    if (!best || missing.length < best.missing.length) best = { combo, missing }
    if (best?.missing.length === 1) break
  }
  return best?.missing.slice(0, 4) || []
}

function buildDeckFromParts(parts, snapshot) {
  const owned = {
    blades: new Set(parts.blades.map(norm)),
    assistBlades: new Set(parts.assistBlades.map(norm)),
    ratchets: new Set(parts.ratchets.map(norm)),
    bits: new Set(parts.bits.map(norm)),
  }
  const feasible = snapshot.combos.filter(
    (combo) =>
      owned.blades.has(norm(combo.blade)) &&
      (!combo.assistBlade || owned.assistBlades.has(norm(combo.assistBlade))) &&
      owned.ratchets.has(norm(combo.ratchet)) &&
      owned.bits.has(norm(combo.bit))
  )
  let decks = findBestDecks(feasible, snapshot.appearanceBaseline, 3)
  let fabricated = false
  if (!decks.length) {
    const candidates = fabricateCandidates(parts, snapshot)
    decks = findBestDecks(candidates, snapshot.appearanceBaseline, 3)
    fabricated = decks.length > 0
  }
  return { decks, fabricated, upgrades: decks.length ? [] : suggestUpgrades(parts, snapshot) }
}

function serializeCombo(combo) {
  return {
    blade: combo.blade,
    assistBlade: combo.assistBlade || null,
    ratchet: combo.ratchet,
    bit: combo.bit,
    appearances: Number(combo.appearances || 0),
    mostRecentAppearance: combo.mostRecentAppearance || null,
  }
}

function serializeDeck(deck, note) {
  return {
    combos: deck.combos.map(serializeCombo),
    grade: deck.grade,
    note: note || null,
  }
}

function serializeEvent(event) {
  return {
    id: String(event.id ?? event._id ?? ""),
    title: event.title || "Tournament result",
    store: event.store || event.storeName || "",
    city: event.city || "",
    region: event.region || "",
    date: event.endTime || event.startTime || event.date || null,
    attendeeCount: Number(event.attendeeCount || event.playerCount || 0),
    topCut: (event.topCut || []).slice(0, 8).map((player, index) => ({
      placement: index + 1,
      name: player.name || `Player ${index + 1}`,
      combos: (player.combos || []).map((combo) => ({
        blade: combo.blade || "",
        assistBlade: combo.assistBlade || null,
        ratchet: combo.ratchet || "",
        bit: combo.bit || "",
      })),
    })),
  }
}

function ownedPartsFromUser(user) {
  const legacy = user?.ownedParts || {}
  const parts = (key) => {
    const current = user?.[key]
    if (Array.isArray(current) && current.length) return current
    return Array.isArray(legacy[key]) ? legacy[key] : Array.isArray(current) ? current : []
  }
  return {
    blades: parts("blades"),
    assistBlades: parts("assistBlades"),
    ratchets: parts("ratchets"),
    bits: parts("bits"),
  }
}

async function optionalUser(req, users) {
  const authorization = req.headers.authorization || ""
  if (!authorization.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET)
    const id = String(payload?.id || payload?.userId || payload?._id || payload?.sub || "")
    if (!id) return null
    return (await users.findOne({ id })) || (await users.findOne({ _id: id }))
  } catch {
    return null
  }
}

function missingCategories(parts) {
  const missing = []
  if (!parts.blades.length) missing.push("Blades")
  if (!parts.ratchets.length) missing.push("Ratchets")
  if (!parts.bits.length) missing.push("Bits")
  return missing
}

function requestIntent(message, hasParts) {
  const query = norm(message)
  if (/\b(clear|forget|reset)\b.*\b(parts|collection|inventory)\b/.test(query)) return "reset"
  if (
    /\b(latest|newest|most recent|recent|last)\b.*\b(result|top cut|event|tournament)\b/.test(query) ||
    /\b(result|top cut)\b.*\b(latest|newest|most recent)\b/.test(query)
  ) return "latest"
  if (
    hasParts ||
    /\b(i own|i have|my parts|my collection|saved parts|saved collection|build from)\b/.test(query)
  ) return "build"
  if (/\b(best|strongest|top|meta)\b.*\b(deck|decks|combo|combos)\b/.test(query)) return "best"
  if (/^(hi|hello|hey|help|what can you do|how do you work)[!.?\s]*$/.test(query)) return "help"
  return "unknown"
}

export default function metabeysBotRoutes({ events, users }) {
  const router = express.Router()
  const rateLimits = new Map()
  let cache = { expiresAt: 0, snapshot: null }

  async function getSnapshot() {
    if (cache.snapshot && cache.expiresAt > Date.now()) return cache.snapshot
    const documents = await events
      .find(
        {},
        {
          projection: {
            id: 1,
            title: 1,
            store: 1,
            storeName: 1,
            city: 1,
            region: 1,
            startTime: 1,
            endTime: 1,
            date: 1,
            createdAt: 1,
            attendeeCount: 1,
            playerCount: 1,
            topCut: 1,
          },
        }
      )
      .toArray()
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, snapshot: buildSnapshot(documents) }
    return cache.snapshot
  }

  router.post("/chat", async (req, res) => {
    try {
      const ip = String(req.ip || req.socket?.remoteAddress || "unknown")
      const now = Date.now()
      const recent = (rateLimits.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
      if (recent.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: "MetaBeys Bot is receiving too many messages. Try again in a minute." })
      }
      recent.push(now)
      rateLimits.set(ip, recent)

      const message = String(req.body?.message || "").trim().slice(0, 1200)
      if (!message) return res.status(400).json({ error: "Ask MetaBeys Bot a question first." })

      const snapshot = await getSnapshot()
      const parsedParts = extractParts(message, snapshot)
      const contextParts = cleanPartContext(req.body?.parts || {}, snapshot)
      const intent = requestIntent(message, partCount(parsedParts) > 0)
      const suggestions = [
        "Show me the latest Top Cut",
        "What is the best deck right now?",
        "Build the best deck from my parts",
      ]

      if (intent === "reset") {
        return res.json({
          type: "parts_reset",
          text: "Done — I cleared the parts from this chat. Tell me your new inventory whenever you're ready.",
          parts: { blades: [], assistBlades: [], ratchets: [], bits: [] },
          suggestions,
        })
      }

      if (intent === "latest") {
        if (!snapshot.latestEvent) {
          return res.json({ type: "message", text: "I couldn't find a completed Top Cut result yet.", suggestions })
        }
        const event = serializeEvent(snapshot.latestEvent)
        const winner = event.topCut[0]?.name
        return res.json({
          type: "latest_result",
          text: `${event.title} is the most recent completed Top Cut in the MetaBeys database${winner ? `. ${winner} finished first` : ""}.`,
          event,
          source: `${snapshot.completedEvents.length} completed events checked`,
          suggestions: ["Show the best current deck", "Build from my saved parts"],
        })
      }

      if (intent === "best") {
        const decks = findBestDecks(snapshot.combos, snapshot.appearanceBaseline, 3)
        if (!decks.length) {
          return res.json({ type: "message", text: "There isn't enough Top Cut data to build a legal deck yet.", suggestions })
        }
        return res.json({
          type: "best_deck",
          text: "This is the strongest legal three-combo deck I can assemble from the current MetaBeys Top Cut database. Different Assist Blades are scored as distinct CX combinations.",
          deck: serializeDeck(decks[0], "Built from current Top Cut data"),
          alternatives: decks.slice(1).map((deck) => serializeDeck(deck, "Alternative meta deck")),
          source: `${snapshot.completedEvents.length} completed events · ${snapshot.combos.length} exact combos`,
          suggestions: ["Show me the latest Top Cut", "Build a deck from my parts"],
        })
      }

      if (intent === "build") {
        const wantsSavedParts = /\b(my collection|saved parts|saved collection|parts i own)\b/.test(norm(message))
        let savedParts = { blades: [], assistBlades: [], ratchets: [], bits: [] }
        if (wantsSavedParts) {
          const user = await optionalUser(req, users)
          if (!user && !partCount(parsedParts) && !partCount(contextParts)) {
            return res.json({
              type: "login_required",
              text: "Sign in first and I can build directly from the parts saved to your MetaBeys profile. You can also paste your parts here without signing in.",
              parts: contextParts,
              suggestions: ["Show me the latest Top Cut", "What is the best deck right now?"],
            })
          }
          if (user) savedParts = cleanPartContext(ownedPartsFromUser(user), snapshot)
        }

        const parts = mergeParts(contextParts, savedParts, parsedParts)
        const missing = missingCategories(parts)
        if (missing.length) {
          const recognized = partCount(parts)
          return res.json({
            type: "parts_needed",
            text: recognized
              ? `I saved the ${recognized} part${recognized === 1 ? "" : "s"} I recognized. I still need your ${missing.join(", ")} before I can make a complete deck. Assist Blades are optional unless you're using CX Blades.`
              : "Send me the Blades, Assist Blades, Ratchets, and Bits you own in one message. Commas, slashes, or a pasted list all work.",
            parts,
            missingCategories: missing,
            suggestions: ["Use my saved collection", "Show the best current deck"],
          })
        }

        const result = buildDeckFromParts(parts, snapshot)
        if (!result.decks.length) {
          return res.json({
            type: "no_legal_deck",
            text: "I recognized your parts, but they don't make three unique legal combinations yet. These are the most useful additions based on current Top Cut data.",
            parts,
            upgrades: result.upgrades,
            suggestions: ["Show the best current deck", "Clear my parts"],
          })
        }

        return res.json({
          type: "parts_deck",
          text: result.fabricated
            ? "I couldn't find three complete historical combinations, so I built the strongest legal deck from your owned parts using real part-pair performance."
            : "Here is the strongest legal three-combo deck you can build from the parts you've given me.",
          parts,
          deck: serializeDeck(
            result.decks[0],
            result.fabricated ? "Built from your parts using meta pairings" : "Exact Top Cut combinations you own"
          ),
          alternatives: result.decks.slice(1).map((deck) => serializeDeck(deck, "Alternative from your parts")),
          source: `${snapshot.completedEvents.length} completed events checked`,
          suggestions: ["Show me the latest Top Cut", "Clear my parts"],
        })
      }

      return res.json({
        type: "help",
        text: "I can show the latest Top Cut, identify the strongest current decks, or build a legal deck from parts you paste here. I only use tournament data stored by MetaBeys.",
        parts: contextParts,
        suggestions,
      })
    } catch (error) {
      console.error("MetaBeys Bot error:", error)
      return res.status(500).json({ error: "MetaBeys Bot couldn't finish that request. Please try again." })
    }
  })

  return router
}
