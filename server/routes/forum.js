import express from "express";
import { getDb } from "../mongo.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const db = await getDb();
  const threads = await db.collection("forum").find().sort({ created_at: -1 }).toArray();

  const output = threads.map(thread => ({
    event_id: thread.event_id,
    title: thread.title,
    created_at: thread.posts?.[0]?.timestamp || thread.created_at || new Date(),
  }));

  res.json(output);
});

router.get("/:eventId", async (req, res) => {
  const db = await getDb();
  const thread = await db.collection("forum").findOne({ event_id: parseInt(req.params.eventId) });
  if (!thread) return res.status(404).json({ message: "Thread not found" });
  res.json(thread);
});

router.post("/:eventId", async (req, res) => {
  const db = await getDb();
  const { username, content, image } = req.body;
  const eventId = parseInt(req.params.eventId);
  const timestamp = new Date();

  const newPost = { username, content, timestamp };
  if (image) newPost.image = image;

  const existing = await db.collection("forum").findOne({ event_id: eventId });

  if (existing) {
    await db.collection("forum").updateOne(
      { event_id: eventId },
      { $push: { posts: newPost } }
    );
    res.json({ message: "Post added" });
  } else {
    await db.collection("forum").insertOne({
      event_id: eventId,
      title: `Discussion for Event ${eventId}`,
      posts: [newPost],
      created_at: timestamp,
    });
    res.json({ message: "Thread created" });
  }
});

export default router;
