// server/routes/chat.js
import { Server } from "socket.io"
import { connectDB } from "../mongo.js"

let io
let onlineUsers = new Map()

export async function initChat(server) {
  io = new Server(server, { cors: { origin: "*" } })

  // ✅ get DB collections
  const { chatMessages } = await connectDB()

  io.on("connection", async socket => {
    // Send the last 50 messages to the new client
    const recent = await chatMessages.find().sort({ ts: -1 }).limit(50).toArray()
    socket.emit("messageHistory", recent.reverse())

    socket.on("join", user => {
      onlineUsers.set(socket.id, user)
      io.emit("onlineUsers", Array.from(onlineUsers.values()))
    })

    socket.on("message", async msg => {
      try {
        const doc = {
          user: msg.user,
          text: msg.text,
          ts: new Date(msg.ts || Date.now()),
        }
        await chatMessages.insertOne(doc)   // ✅ save to DB
        io.emit("message", doc)             // broadcast to all clients
      } catch (err) {
        console.error("❌ Failed to save message", err)
      }
    })

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id)
      io.emit("onlineUsers", Array.from(onlineUsers.values()))
    })
  })
}
