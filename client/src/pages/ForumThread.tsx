import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

interface Post {
  username: string
  content: string
  timestamp: string
}

interface Thread {
  event_id: number
  title: string
  posts: Post[]
}

export default function ForumThread() {
  const { id } = useParams()
  const [thread, setThread] = useState<Thread | null>(null)
  const [username, setUsername] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          // Thread doesn't exist yet, create empty placeholder
          setThread({
            event_id: parseInt(id || ""),
            title: `Discussion for Event ${id}`,
            posts: [],
          })
          return
        }
        if (!res.ok) throw new Error("Failed to fetch thread")
        const data = await res.json()
        setThread(data)
      })
      .catch(() => setThread(null))
      .finally(() => setLoading(false))
  }, [id])

  const submitPost = async () => {
    if (!username.trim() || !content.trim()) return

    const res = await fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, content }),
    })

    if (res.ok) {
      setContent("")
      setThread((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          posts: [...prev.posts, { username, content, timestamp: new Date().toISOString() }],
        }
      })
    }
  }

  if (loading) return <p className="p-4">Loading...</p>
  if (!thread) return <p className="p-4 text-red-600">Thread not found.</p>

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{thread.title}</h1>

      <div className="mb-6 space-y-4">
        {thread.posts && thread.posts.length > 0 ? (
          thread.posts.map((post, idx) => (
            <div key={idx} className="border rounded p-3 shadow-sm">
              <p className="font-semibold text-blue-700">{post.username}</p>
              <p className="text-gray-700">{post.content}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(post.timestamp).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No posts yet. Be the first to start the discussion!</p>
        )}
      </div>

      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold mb-2">Add a Post</h2>
        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <textarea
          className="border p-2 w-full mb-2 rounded"
          placeholder="Write something..."
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={submitPost}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </div>
    </div>
  )
}
