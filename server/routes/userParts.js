const express = require("express");
const router = express.Router();

// ✅ Adjust to your actual auth middleware & db
const { requireAuth } = require("../middleware/auth"); // must set req.user.id
const db = require("../db"); // however you export your Mongo client/connection

// GET /api/me/parts → fetch saved parts for current user
router.get("/parts", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id; // requireAuth should ensure this exists
    const doc = await db.collection("user_parts").findOne({ userId: uid });
    if (!doc) {
      return res.json({ blades: [], ratchets: [], bits: [] });
    }
    res.json({
      blades: doc.blades || [],
      ratchets: doc.ratchets || [],
      bits: doc.bits || [],
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load parts" });
  }
});

module.exports = router;
