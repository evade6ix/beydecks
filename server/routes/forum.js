import express from "express"
import { getDb } from "../mongo.js"

const router = express.Router()

router.get("/", async (req, res) => {
  const db = await getDb()
  const threads = await db.collection("forum").find().sort({ created_at: -1 }).toArray()

  const output = threads.map(thread => ({
    event_id: thread.event_id,
    title: thread.title,
    created_at: thread.posts?.[0]?.timestamp || thread.created_at || new Date(),
  }))

  res.json(output)
})

router.get("/:eventId", async (req, res) => {
  const db = await getDb()
  const thread = await db.collection("forum").findOne({ event_id: parseInt(req.params.eventId) })
  if (!thread) return res.status(404).json({ message: "Thread not found" })

  const usersCollection = db.collection("users")

  const enrichedPosts = await Promise.all(
    (thread.posts || []).map(async (post) => {
      const user = await usersCollection.findOne({ username: post.username })
      const badge = user?.badge || null
      return { ...post, badge }
    })
  )

  res.json({ ...thread, posts: enrichedPosts })
})

router.post("/:eventId", async (req, res) => {
  const db = await getDb()
  const { username, content, image } = req.body
  const eventId = parseInt(req.params.eventId)
  const timestamp = new Date()

  if (!username || !content) {
    return res.status(400).json({ message: "Missing username or content" })
  }

  const newPost = {
    username,
    content,
    timestamp,
    ...(image ? { image } : {}),
  }

  const existing = await db.collection("forum").findOne({ event_id: eventId })

  if (existing) {
    await db.collection("forum").updateOne(
      { event_id: eventId },
      { $push: { posts: newPost } }
    )
    res.json({ message: "Post added" })
  } else {
    await db.collection("forum").insertOne({
      event_id: eventId,
      title: `Discussion for Event ${eventId}`,
      posts: [newPost],
      created_at: timestamp,
    })
    res.json({ message: "Thread created" })
  }
})

// 🧹 DELETE a specific post by its index (must match username)
router.delete("/:eventId/post/:index", async (req, res) => {
  const db = await getDb()
  const { eventId, index } = req.params
  const { username } = req.body

  const thread = await db.collection("forum").findOne({ event_id: parseInt(eventId) })
  if (!thread) return res.status(404).json({ message: "Thread not found" })

  const post = thread.posts[parseInt(index)]
  if (!post) return res.status(404).json({ message: "Post not found" })
  if (post.username !== username) {
    return res.status(403).json({ message: "Unauthorized – only author can delete this post" })
  }

  thread.posts.splice(index, 1)

  await db.collection("forum").updateOne(
    { event_id: parseInt(eventId) },
    { $set: { posts: thread.posts } }
  )

  res.json({ message: "Post deleted" })
})

export default router
