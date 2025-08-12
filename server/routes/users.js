// server/routes/users.js
import express from "express"
import jwt from "jsonwebtoken"

/* ------------------------------------------
   Helpers
------------------------------------------- */
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

const publicProjection = {
  id: 1,
  _id: 1,
  username: 1,
  displayName: 1,
  slug: 1,
  avatarDataUrl: 1,
  bio: 1,
  homeStore: 1,

  // legacy container (keep for back-compat)
  ownedParts: 1,

  // NEW: top-level parts used by your DB
  blades: 1,
  assistBlades: 1,
  ratchets: 1,
  bits: 1,
  partsUpdatedAt: 1,

  // tournaments & counters
  tournamentsPlayed: 1,
  firsts: 1,
  seconds: 1,
  thirds: 1,
  topCutCount: 1,
}

function getBearerToken(req) {
  const h = req.headers.authorization || ""
  return h.startsWith("Bearer ") ? h.slice(7) : null
}

function requireAuth(usersCol) {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req)
      if (!token) return res.status(401).json({ error: "Missing auth token" })
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const userId = payload?.id || payload?.userId || payload?._id || payload?.sub
      if (!userId) return res.status(401).json({ error: "Invalid token" })

      const me =
        (await usersCol.findOne({ id: String(userId) })) ||
        (await usersCol.findOne({ _id: userId }))
      if (!me) return res.status(401).json({ error: "User not found" })

      req.me = me
      next()
    } catch {
      return res.status(401).json({ error: "Unauthorized" })
    }
  }
}

/* Build ownedParts from top-level arrays when legacy container is empty */
function normalizeOwnedParts(u) {
  const legacy = u?.ownedParts || {}
  const legacyHasData =
    (Array.isArray(legacy.blades) && legacy.blades.length) ||
    (Array.isArray(legacy.assistBlades) && legacy.assistBlades.length) ||
    (Array.isArray(legacy.ratchets) && legacy.ratchets.length) ||
    (Array.isArray(legacy.bits) && legacy.bits.length)

  if (legacyHasData) return legacy

  return {
    blades: Array.isArray(u?.blades) ? u.blades : [],
    assistBlades: Array.isArray(u?.assistBlades) ? u.assistBlades : [],
    ratchets: Array.isArray(u?.ratchets) ? u.ratchets : [],
    bits: Array.isArray(u?.bits) ? u.bits : [],
  }
}

/* Shape a public user payload consistently */
function publicUserPayload(u, { includeTournaments = true } = {}) {
  const tournamentsPlayed = Array.isArray(u.tournamentsPlayed) ? u.tournamentsPlayed : []
  const tournamentsCount = tournamentsPlayed.length

  const ownedParts = normalizeOwnedParts(u)

  const base = {
    id: u.id ?? u._id,
    username: u.username || "",
    displayName: u.displayName || u.username || "",
    slug: u.slug,
    avatarDataUrl: u.avatarDataUrl || "",
    bio: u.bio || "",
    homeStore: u.homeStore || "",

    // normalized parts + timestamp
    ownedParts,
    partsUpdatedAt: u.partsUpdatedAt || null,

    // also expose top-level arrays (future-proof / optional for UIs)
    blades: Array.isArray(u.blades) ? u.blades : [],
    assistBlades: Array.isArray(u.assistBlades) ? u.assistBlades : [],
    ratchets: Array.isArray(u.ratchets) ? u.ratchets : [],
    bits: Array.isArray(u.bits) ? u.bits : [],

    // counters
    firsts: Number(u.firsts || 0),
    seconds: Number(u.seconds || 0),
    thirds: Number(u.thirds || 0),
    topCutCount: Number(u.topCutCount || 0),

    stats: { tournamentsCount },
  }

  if (!includeTournaments) return base
  return { ...base, tournamentsPlayed }
}

/* ------------------------------------------
   Router
------------------------------------------- */
export default function usersRoutes({ users }) {
  const router = express.Router()

  /* ---------- Admin/Editor search (autocomplete) ---------- */
  // GET /users/search?q=term
  router.get("/search", async (req, res) => {
    const q = String(req.query.q || "").trim()
    if (q.length < 2) return res.json([])

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const rx = new RegExp(safe, "i")

    const hits = await users
      .find(
        { $or: [{ username: rx }, { displayName: rx }] },
        { projection: { id: 1, _id: 1, username: 1, displayName: 1, slug: 1, avatarDataUrl: 1 } }
      )
      .limit(8)
      .toArray()

    res.json(
      hits.map((u) => ({
        id: u.id ?? String(u._id),
        username: u.username || "",
        displayName: u.displayName || "",
        slug: u.slug || "",
        avatarDataUrl: u.avatarDataUrl || "",
      }))
    )
  })

  /* ---------- Public profile by slug (used by /u/:slug) ---------- */
  router.get("/slug/:slug", async (req, res) => {
    const slug = String(req.params.slug || "").trim().toLowerCase()
    if (!slug) return res.status(400).json({ error: "Missing slug" })

    const u = await users.findOne({ slug }, { projection: publicProjection })
    if (!u) return res.status(404).json({ error: "User not found" })

    return res.json(publicUserPayload(u, { includeTournaments: true }))
  })

  /* ---------- Optional: public by ID (avoid catch-all conflicts) ---------- */
  router.get("/id/:id", async (req, res) => {
    const id = String(req.params.id || "")
    if (!id) return res.status(400).json({ error: "Missing id" })

    const u =
      (await users.findOne({ id }, { projection: publicProjection })) ||
      (await users.findOne({ _id: id }, { projection: publicProjection }))

    if (!u) return res.status(404).json({ error: "User not found" })

    return res.json(publicUserPayload(u, { includeTournaments: true }))
  })

  /* ---------- Edit own profile ---------- */
  // NOTE:
  // - Username is the canonical identity.
  // - Slug always follows username (unique); no keepSlug anymore.
  // - Avatar can be set to a data URL or cleared by sending "".
  // - Owned parts are NOT updated here (they come from the BuildFromMyParts flow).
  router.patch("/me", requireAuth(users), async (req, res) => {
    const me = req.me
    const { username, displayName, avatarDataUrl, bio, homeStore } = req.body || {}
    const $set = {}

    // Username -> validate, ensure uniqueness, and sync slug to username
    if (typeof username === "string" && username !== me.username) {
      if (!usernameOk(username)) {
        return res
          .status(400)
          .json({ error: "Username must be 3–24 chars: letters, numbers, underscores, dots." })
      }
      const exists = await users.findOne({ username }, { projection: { _id: 1 } })
      if (exists && String(exists._id) !== String(me._id)) {
        return res.status(409).json({ error: "Username already taken" })
      }
      $set.username = username

      // slug mirrors username
      const base = slugify(username) || `user-${String(me._id).slice(-6)}`
      let candidate = base
      let n = 0
      // eslint-disable-next-line no-await-in-loop
      while (await users.findOne({ slug: candidate, _id: { $ne: me._id } })) {
        n += 1
        candidate = `${base}-${n}`
      }
      $set.slug = candidate

      // If they never had a displayName, default it to username once
      if (!me.displayName && !displayName) $set.displayName = username
    }

    // Display name stays optional "flair" (not used for slug)
    if (typeof displayName === "string") {
      const clean = displayName.trim()
      if (clean) $set.displayName = clean
      else if (displayName === "") $set.displayName = "" // allow clearing if you want that behavior
    }

    // Avatar: allow data URL or clear by sending ""
    if (typeof avatarDataUrl === "string") {
      const ok =
        avatarDataUrl === "" ||
        (avatarDataUrl.startsWith("data:image/") && avatarDataUrl.includes(";base64,"))
      if (!ok) {
        return res.status(400).json({ error: "avatarDataUrl must be a base64 data URL (or empty to clear)" })
      }
      $set.avatarDataUrl = avatarDataUrl
    }

    if (typeof bio === "string") $set.bio = bio.slice(0, 500)
    if (typeof homeStore === "string") $set.homeStore = homeStore.slice(0, 120)

    // Intentionally ignore ownedParts here — managed elsewhere

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

    const result = await users.findOneAndUpdate(
      { _id: me._id },
      { $set },
      { returnDocument: "after", projection: publicProjection }
    )

    const u = result.value
    return res.json(publicUserPayload(u, { includeTournaments: true }))
  })

  return router
}
