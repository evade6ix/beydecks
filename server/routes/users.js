// server/routes/users.js
import express from "express"
import jwt from "jsonwebtoken"

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

const usernameOk = (s) => /^[a-zA-Z0-9_\.]{3,24}$/.test(String(s || ""))

const publicUserProjection = {
  id: 1,
  _id: 1,
  username: 1,
  displayName: 1,
  slug: 1,
  avatarDataUrl: 1,
  bio: 1,
  homeStore: 1,
  ownedParts: 1,
  tournamentsPlayed: 1,
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

export default function usersRoutes({ users }) {
  const router = express.Router()

  // --- NEW: lightweight search for admin autocomplete ---
  // GET /users/search?q=term
  router.get("/search", async (req, res) => {
    const q = String(req.query.q || "").trim()
    if (q.length < 2) return res.json([])

    // escape regex special chars
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

    const hits = await users
      .find(
        { $or: [{ username: rx }, { displayName: rx }] },
        { projection: { id: 1, _id: 1, username: 1, displayName: 1, slug: 1, avatarDataUrl: 1 } }
      )
      .limit(8)
      .toArray()

    // normalize id shape for client
    const result = hits.map((u) => ({
      id: u.id ?? String(u._id),
      username: u.username || "",
      displayName: u.displayName || "",
      slug: u.slug || "",
      avatarDataUrl: u.avatarDataUrl || "",
    }))

    res.json(result)
  })

  // Public profile by slug
  router.get("/slug/:slug", async (req, res) => {
    const slug = String(req.params.slug || "").trim().toLowerCase()
    if (!slug) return res.status(400).json({ error: "Missing slug" })

    const u = await users.findOne({ slug }, { projection: publicUserProjection })
    if (!u) return res.status(404).json({ error: "User not found" })

    const tournamentsCount = Array.isArray(u.tournamentsPlayed) ? u.tournamentsPlayed.length : 0
    return res.json({
      id: u.id ?? u._id,
      username: u.username || "",
      displayName: u.displayName || "",
      // prefer displayName in UI but always send username too
      name: u.displayName || u.username || "",
      slug: u.slug,
      avatarDataUrl: u.avatarDataUrl || "",
      bio: u.bio || "",
      homeStore: u.homeStore || "",
      ownedParts: u.ownedParts || { blades: [], assistBlades: [], ratchets: [], bits: [] },
      stats: { tournamentsCount },
    })
  })

  // Backwards-compat GET /users/:slug (optional)
  router.get("/:slug", async (req, res) => {
    const u = await users.findOne(
      { slug: String(req.params.slug || "").toLowerCase() },
      { projection: publicUserProjection }
    )
    if (!u) return res.status(404).json({ error: "User not found" })
    const tournamentsCount = Array.isArray(u.tournamentsPlayed) ? u.tournamentsPlayed.length : 0
    return res.json({
      id: u.id ?? u._id,
      username: u.username || "",
      displayName: u.displayName || "",
      name: u.displayName || u.username || "",
      slug: u.slug,
      avatarDataUrl: u.avatarDataUrl || "",
      bio: u.bio || "",
      homeStore: u.homeStore || "",
      ownedParts: u.ownedParts || { blades: [], assistBlades: [], ratchets: [], bits: [] },
      stats: { tournamentsCount },
    })
  })

  // Edit own profile
  router.patch("/me", requireAuth(users), async (req, res) => {
    const me = req.me
    const { username, displayName, avatarDataUrl, bio, homeStore, ownedParts, keepSlug } = req.body || {}
    const $set = {}

    // username: canonical
    if (typeof username === "string" && username !== me.username) {
      if (!usernameOk(username)) {
        return res.status(400).json({ error: "Username must be 3–24 chars: letters, numbers, underscores, dots." })
      }
      const exists = await users.findOne({ username }, { projection: { _id: 1 } })
      if (exists && String(exists._id) !== String(me._id)) {
        return res.status(409).json({ error: "Username already taken" })
      }
      $set.username = username
      if (!keepSlug) {
        // regenerate slug from username
        const base = slugify(username) || `user-${String(me._id).slice(-6)}`
        let candidate = base
        let n = 0
        // eslint-disable-next-line no-await-in-loop
        while (await users.findOne({ slug: candidate, _id: { $ne: me._id } })) {
          n += 1
          candidate = `${base}-${n}`
        }
        $set.slug = candidate
      }
      // If displayName not explicitly provided, keep it as-is;
      // or set it to username the first time user gets a username.
      if (!displayName && !me.displayName) $set.displayName = username
    }

    // optional displayName (kept as flair)
    if (typeof displayName === "string" && displayName.trim()) {
      $set.displayName = displayName.trim()
      // do NOT auto-change slug from displayName anymore
    }

    if (typeof avatarDataUrl === "string") {
      if (avatarDataUrl === "" || (avatarDataUrl.startsWith("data:image/") && avatarDataUrl.includes(";base64,"))) {
        $set.avatarDataUrl = avatarDataUrl
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

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

    const result = await users.findOneAndUpdate(
      { _id: me._id },
      { $set },
      { returnDocument: "after", projection: publicUserProjection }
    )

    const u = result.value
    return res.json({
      id: u.id ?? u._id,
      username: u.username || "",
      displayName: u.displayName || "",
      name: u.displayName || u.username || "",
      slug: u.slug,
      avatarDataUrl: u.avatarDataUrl || "",
      bio: u.bio || "",
      homeStore: u.homeStore || "",
      ownedParts: u.ownedParts || { blades: [], assistBlades: [], ratchets: [], bits: [] },
    })
  })

  return router
}
