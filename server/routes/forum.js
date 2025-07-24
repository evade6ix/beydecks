import express from "express";
import { getDb } from "../mongo.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const db = await getDb();
  const threads = await db.collection("forum").find().sort({ created_at: -1 }).toArray();
  res.json(threads);
});

router.get("/:eventId", async (req, res) => {
  const db = await getDb();
  const thread = await db.collection("forum").findOne({ event_id: parseInt(req.params.eventId) });
  if (!thread) return res.status(404).json({ message: "Thread not found" });
  res.json(thread);
});

router.post("/:eventId", async (req, res) => {
  const db = await getDb();
  const { username, content } = req.body;
  const eventId = parseInt(req.params.eventId);
  const timestamp = new Date();

  const existing = await db.collection("forum").findOne({ event_id: eventId });

  if (existing) {
    await db.collection("forum").updateOne(
      { event_id: eventId },
      { $push: { posts: { username, content, timestamp } } }
    );
    res.json({ message: "Post added" });
  } else {
    await db.collection("forum").insertOne({
      event_id: eventId,
      title: `Discussion for Event ${eventId}`,
      posts: [{ username, content, timestamp }],
      created_at: timestamp,
    });
    res.json({ message: "Thread created" });
  }
});

export default router;
