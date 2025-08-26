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

    // --- Self-heal: if this account has no slug yet, create one (do NOT override an existing slug) ---
    if ((!me.slug || me.slug.trim() === "") && typeof $set.slug === "undefined") {
      const base =
        slugify($set.username || me.username || me.displayName || me.email?.split?.("@")?.[0]) ||
        `user-${String(me._id).slice(-6)}`
      let candidate = base
      let n = 0
      // ensure uniqueness without touching other users' slugs
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
      { returnDocument: "after", projection: publicProjection }
    )

    const u = result.value
    return res.json(publicUserPayload(u, { includeTournaments: true }))
  })

/* ---------- Player leaderboard (paginated, server-derived) ---------- */
// GET /users/leaderboard?page=1&pageSize=20&sort=total&q=needle
router.get("/leaderboard", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10) || 20))
    const sortKey = String(req.query.sort || "total").toLowerCase()
    const q = String(req.query.q || "").trim()

    const sortMap = {
      total: { _results: -1, _firsts: -1, _seconds: -1, _thirds: -1, slug: 1 },
      firsts: { _firsts: -1, _results: -1, _seconds: -1, _thirds: -1, slug: 1 },
      seconds: { _seconds: -1, _results: -1, _firsts: -1, _thirds: -1, slug: 1 },
      thirds: { _thirds: -1, _results: -1, _firsts: -1, _seconds: -1, slug: 1 },
      topcuts: { _topcutsOnly: -1, _results: -1, _firsts: -1, _seconds: -1, slug: 1 },
    }
    const sortStage = sortMap[sortKey] || sortMap.total

    // Text filter on username/displayName/slug
    const match = q
      ? {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
            { slug: { $regex: q, $options: "i" } },
          ],
        }
      : {}

    // Build derived counters from tournamentsPlayed when present
    // Otherwise fall back to firsts/seconds/thirds/topCutCount
    const pipeline = [
      { $match: match },

      // Safety defaults so expressions don't explode on nulls
      {
        $addFields: {
          tournamentsPlayed: { $ifNull: ["$tournamentsPlayed", []] },
          firsts: { $toInt: { $ifNull: ["$firsts", 0] } },
          seconds: { $toInt: { $ifNull: ["$seconds", 0] } },
          thirds: { $toInt: { $ifNull: ["$thirds", 0] } },
          topCutCount: { $toInt: { $ifNull: ["$topCutCount", 0] } },
        },
      },

      // Compute per-placement counts from tournamentsPlayed
      {
        $addFields: {
          tpLen: { $size: "$tournamentsPlayed" },
          tpFirsts: {
            $size: {
              $filter: {
                input: "$tournamentsPlayed",
                as: "t",
                cond: { $eq: ["$$t.placement", "First Place"] },
              },
            },
          },
          tpSeconds: {
            $size: {
              $filter: {
                input: "$tournamentsPlayed",
                as: "t",
                cond: { $eq: ["$$t.placement", "Second Place"] },
              },
            },
          },
          tpThirds: {
            $size: {
              $filter: {
                input: "$tournamentsPlayed",
                as: "t",
                cond: { $eq: ["$$t.placement", "Third Place"] },
              },
            },
          },
          tpTopCutsOnly: {
            $size: {
              $filter: {
                input: "$tournamentsPlayed",
                as: "t",
                cond: { $eq: ["$$t.placement", "Top Cut"] },
              },
            },
          },
        },
      },

      // Choose source: tournamentsPlayed-derived vs stored counters
      {
        $addFields: {
          _firsts: { $cond: [{ $gt: ["$tpLen", 0] }, "$tpFirsts", "$firsts"] },
          _seconds: { $cond: [{ $gt: ["$tpLen", 0] }, "$tpSeconds", "$seconds"] },
          _thirds: { $cond: [{ $gt: ["$tpLen", 0] }, "$tpThirds", "$thirds"] },
          _topcutsOnly: {
            $cond: [
              { $gt: ["$tpLen", 0] },
              "$tpTopCutsOnly",
              {
                $let: {
                  vars: {
                    podium: { $add: ["$firsts", "$seconds", "$thirds"] },
                  },
                  in: {
                    $cond: [
                      { $lte: ["$topCutCount", "$$podium"] },
                      0,
                      { $subtract: ["$topCutCount", "$$podium"] },
                    ],
                  },
                },
              },
            ],
          },
        },
      },

      // Totals, display name fallback
      {
        $addFields: {
          _results: { $add: ["$_firsts", "$_seconds", "$_thirds", "$_topcutsOnly"] },
          _name: { $ifNull: [{ $trim: { input: "$username" } }, { $ifNull: ["$displayName", "$slug"] }] },
        },
      },

      // Final projection
      {
        $project: {
          _id: 0,
          slug: 1,
          username: 1,
          displayName: 1,
          avatarDataUrl: 1,
          _firsts: 1,
          _seconds: 1,
          _thirds: 1,
          _topcutsOnly: 1,
          _results: 1,
          _name: 1,
        },
      },

      { $sort: sortStage },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]

    // total count for pagination (match only, not sort/skip/limit)
    const total = await users.countDocuments(match)
    const rows = await users.aggregate(pipeline).toArray()

    return res.json({ ok: true, page, pageSize, sort: sortKey, total, rows })
  } catch (err) {
    console.error("[/users/leaderboard] error:", err)
    return res.status(500).json({ ok: false, error: "Leaderboard failed" })
  }
})
/* ---------- Per-user avatar (serves image bytes) ---------- */
// GET /users/avatar/:slug
router.get("/avatar/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase()
    if (!slug) return res.status(400).send("Missing slug")

    const u = await users.findOne(
      { slug },
      { projection: { _id: 0, avatarDataUrl: 1 } }
    )
    if (!u || !u.avatarDataUrl) return res.status(404).send("No avatar")

    const dataUrl = String(u.avatarDataUrl)
    // must be like: data:image/png;base64,AAAA...
    if (!dataUrl.startsWith("data:image/") || !dataUrl.includes(";base64,")) {
      return res.status(400).send("Invalid avatar data URL")
    }

    const [meta, b64] = dataUrl.split(",")
    const mime = meta.slice("data:".length).replace(";base64", "") || "image/png"
    const buf = Buffer.from(b64, "base64")

    res.setHeader("Content-Type", mime)
    // cache it a bit so list scrolling isn’t chatty
    res.setHeader("Cache-Control", "public, max-age=86400, immutable")
    // weak ETag from size to help browser revalidation
    res.setHeader("ETag", `W/"${buf.length.toString(16)}-${slug}"`)

    return res.status(200).end(buf)
  } catch (e) {
    console.error("[/users/avatar/:slug] error:", e)
    return res.status(500).send("Avatar error")
  }
})

  return router
}
