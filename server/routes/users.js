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

  // Public profile by slug
  router.get("/:slug", async (req, res) => {
    const { slug } = req.params
    const u = await users.findOne({ slug }, { projection: publicUserProjection })
    if (!u) return res.status(404).json({ error: "User not found" })

    const tournamentsCount = Array.isArray(u.tournamentsPlayed) ? u.tournamentsPlayed.length : 0
    return res.json({
      id: u.id ?? u._id,
      displayName: u.displayName || "",
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
    const { displayName, avatarDataUrl, bio, homeStore, ownedParts, keepSlug } = req.body || {}
    const $set = {}

    if (typeof displayName === "string" && displayName.trim()) $set.displayName = displayName.trim()

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

    const result = await users.findOneAndUpdate(
      { _id: me._id },
      { $set },
      { returnDocument: "after", projection: publicUserProjection }
    )

    const u = result.value
    return res.json({
      id: u.id ?? u._id,
      displayName: u.displayName || "",
      slug: u.slug,
      avatarDataUrl: u.avatarDataUrl || "",
      bio: u.bio || "",
      homeStore: u.homeStore || "",
      ownedParts: u.ownedParts || { blades: [], assistBlades: [], ratchets: [], bits: [] },
    })
  })

  return router
}
