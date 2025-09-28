// server/mongo.js
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) throw new Error("❌ MONGODB_URI is not defined in .env")

let client
let db

export const connectDB = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db() // Uses DB from URI automatically
    console.log("✅ Connected to MongoDB")
  }

  const chatMessages = db.collection("chatMessages")
  // TTL: auto-delete after 24h
  await chatMessages.createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 })

  return {
    users: db.collection("users"),
    products: db.collection("products"),
    events: db.collection("events"),
    stores: db.collection("stores"),
    prepDecks: db.collection("prep_decks"),
    chatMessages, // ✅ new
  }
}

// Add this to allow direct db access from routes like forum.js
export const getDb = () => {
  if (!db) throw new Error("MongoDB not connected yet")
  return db
}
