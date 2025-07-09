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
    db = client.db() // ✅ uses `beyblade` from URI automatically
    console.log("✅ Connected to MongoDB")
  }

  return {
    users: db.collection("users"),
    products: db.collection("products"),
    events: db.collection("events"),
    stores: db.collection("stores"),
    prepDecks: db.collection("prep_decks"),
  }
}
