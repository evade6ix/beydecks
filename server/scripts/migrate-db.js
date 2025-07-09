// File: server/scripts/migrate-db.js
import "dotenv/config"
import { readFile } from "fs/promises"
import { MongoClient } from "mongodb"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, "../db/db.json")

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = "beyblade"

if (!MONGODB_URI) throw new Error("❌ MONGODB_URI not set in .env")

const run = async () => {
  console.log("🚀 Migrating db.json → MongoDB")

  const raw = await readFile(dbPath, "utf-8")
  const json = JSON.parse(raw)

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  const collections = ["users", "events", "stores", "products"]
  for (const name of collections) {
    if (!json[name]) continue
    const col = db.collection(name)
    const docs = json[name]

    console.log(`⚙️ Inserting ${docs.length} → ${name}`)
    await col.deleteMany({})
    if (docs.length > 0) await col.insertMany(docs)
  }

  console.log("✅ Migration complete!")
  await client.close()
}

run().catch(err => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})
