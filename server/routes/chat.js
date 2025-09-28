// server/routes/chat.js
import { Server } from "socket.io"

let io
let onlineUsers = new Map()

export function initChat(server) {
  io = new Server(server, { cors: { origin: "*" } })

  io.on("connection", socket => {
    socket.on("join", user => {
      onlineUsers.set(socket.id, user)
      io.emit("onlineUsers", Array.from(onlineUsers.values()))
    })

    socket.on("message", msg => {
      io.emit("message", msg)
    })

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id)
      io.emit("onlineUsers", Array.from(onlineUsers.values()))
    })
  })
}
