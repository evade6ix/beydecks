import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

interface ForumThread {
  event_id: number
  title: string
  created_at: string
  username?: string
}

export default function Forum() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [search, setSearch] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newPost, setNewPost] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

  useEffect(() => {
    fetch(`${API}/forum`)
      .then(res => res.json())
      .then(data => setThreads(data))
      .catch(err => console.error("❌ Failed to load forum threads", err))
  }, [])

  const handleSubmit = async () => {
    if (!user?.username || !newTitle.trim() || !newPost.trim()) return

    setSubmitting(true)

    // Use current timestamp as fake event_id to guarantee uniqueness
    const fakeEventId = Date.now()

    const res = await fetch(`${API}/forum/${fakeEventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        content: newPost.trim(),
        title: newTitle.trim()
      })
    })

    if (res.ok) {
      setNewTitle("")
      setNewPost("")
      const updatedThreads = await fetch(`${API}/forum`).then(res => res.json())
      setThreads(updatedThreads)
    }

    setSubmitting(false)
  }

  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 flex items-center gap-3">🗣 Event Discussions</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search discussions..."
        className="border border-gray-300 rounded-md px-4 py-2 w-full mb-6"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* New Thread Form */}
      {user && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-10">
          <h2 className="text-xl font-semibold mb-4">Start a New Discussion</h2>
          <input
            type="text"
            placeholder="Title of your discussion"
            className="border px-3 py-2 w-full rounded mb-3"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2 mb-3"
            rows={4}
            placeholder="What’s on your mind?"
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Create Thread"}
          </button>
        </div>
      )}

      {/* Threads List */}
      {filteredThreads.length === 0 ? (
        <p className="text-gray-500 text-lg">No threads match your search.</p>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <ul>
            {filteredThreads.map(thread => (
              <li
                key={thread.event_id}
                className="border-b px-6 py-4 hover:bg-gray-50 transition"
              >
                <Link
                  to={`/forum/${thread.event_id}`}
                  className="text-lg font-semibold text-blue-600 hover:underline block"
                >
                  {thread.title}
                </Link>
                <p className="text-sm text-gray-500">
                  Created by {thread.username ?? "Unknown"} on{" "}
                  {new Date(thread.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
