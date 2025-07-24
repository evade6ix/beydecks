import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext" // Adjust this import to your actual auth context path

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
  const { user, loading: authLoading } = useAuth()
  const [thread, setThread] = useState<Thread | null>(null)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          // Create empty thread object for new event discussions
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
    if (!user) return
    if (!content.trim()) return

    setSubmitting(true)
    const res = await fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username || user.username || "Anonymous", content }),
    })
    setSubmitting(false)

    if (res.ok) {
      setContent("")
      setThread((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          posts: [
            ...prev.posts,
            { username: user.username || user.username || "Anonymous", content, timestamp: new Date().toISOString() },
          ],
        }
      })
    } else {
      alert("Failed to submit post. Please try again.")
    }
  }

  if (loading || authLoading) return <p className="p-4">Loading...</p>
  if (!thread) return <p className="p-4 text-red-600">Thread not found.</p>

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6 border-b pb-3">{thread.title}</h1>

      <div className="mb-8 max-h-[60vh] overflow-y-auto space-y-6 pr-2">
        {thread.posts.length > 0 ? (
          thread.posts.map((post, idx) => (
            <div key={idx} className="border rounded-lg p-4 shadow-sm bg-gray-50">
              <p className="font-semibold text-indigo-700">{post.username}</p>
              <p className="mt-1 text-gray-800 whitespace-pre-wrap">{post.content}</p>
              <p className="text-xs text-gray-500 mt-2">{new Date(post.timestamp).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600 italic">No posts yet. Be the first to start the discussion!</p>
        )}
      </div>

      {!user ? (
        <p className="text-center text-red-600 font-semibold">
          You must <Link to="/login" className="text-indigo-600 underline">log in</Link> to post.
        </p>
      ) : (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Add a Post</h2>
          <textarea
            className="border rounded p-3 w-full mb-4 resize-y min-h-[100px] focus:outline-indigo-500"
            placeholder="Write something..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
          />
          <button
            onClick={submitPost}
            disabled={submitting || !content.trim()}
            className={`w-full py-3 rounded text-white font-semibold ${
              submitting || !content.trim() ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  )
}
