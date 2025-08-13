import express from "express"
import { getDb } from "../mongo.js"
const router = express.Router()

router.get("/users/leaderboard", async (req, res) => {
  const db = await getDb()
  const limit = Math.min(Number(req.query.limit) || 200, 500)
  try {
    const Users = db.collection("users")
    const rows = await Users
      .aggregate([
        {
          $addFields: {
            tournamentsCount: {
              $cond: [
                { $isArray: "$tournamentsPlayed" },
                { $size: "$tournamentsPlayed" },
                0
              ]
            }
          }
        },
        {
          $project: {
            slug: 1,
            username: 1,
            displayName: 1,
            avatarDataUrl: 1,
            firsts: { $ifNull: ["$firsts", 0] },
            seconds: { $ifNull: ["$seconds", 0] },
            thirds: { $ifNull: ["$thirds", 0] },
            topCutCount: { $ifNull: ["$topCutCount", 0] },
            tournamentsCount: 1
          }
        },
        {
          $addFields: {
            total: {
              $add: ["$tournamentsCount"] // already includes Top Cut + podium because you push a row for each result
            }
          }
        },
        { $sort: { total: -1, firsts: -1 } },
        { $limit: limit }
      ])
      .toArray()

    res.json(rows)
  } catch (e) {
    console.error("leaderboard error:", e)
    res.status(500).json({ error: "Failed to build leaderboard" })
  }
})

export default router
