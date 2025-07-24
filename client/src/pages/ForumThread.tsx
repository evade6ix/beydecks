import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

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
      body: JSON.stringify({ username: user.username || "Anonymous", content }),
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
            { username: user.username || "Anonymous", content, timestamp: new Date().toISOString() },
          ],
        }
      })
    } else {
      alert("Failed to submit post. Please try again.")
    }
  }

  if (loading || authLoading) return <p className="p-4 text-center text-gray-300">Loading...</p>
  if (!thread) return <p className="p-4 text-center text-red-600">Thread not found.</p>

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100">
      <h1 className="text-3xl font-bold mb-6 border-b border-gray-700 pb-4">{thread.title}</h1>

      <div className="mb-8 max-h-[60vh] overflow-y-auto space-y-6 pr-3">
        {thread.posts.length > 0 ? (
          thread.posts.map((post, idx) => (
            <article
              key={idx}
              className="bg-gray-800 rounded-lg p-5 shadow-md hover:bg-gray-700 transition"
            >
              <header className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-indigo-400">{post.username}</h3>
                <time
                  className="text-xs text-gray-400"
                  dateTime={post.timestamp}
                  title={new Date(post.timestamp).toLocaleString()}
                >
                  {new Date(post.timestamp).toLocaleDateString()}
                </time>
              </header>
              <p className="whitespace-pre-wrap text-gray-200">{post.content}</p>
            </article>
          ))
        ) : (
          <p className="text-gray-500 italic text-center">No posts yet. Be the first to start the discussion!</p>
        )}
      </div>

      {!user ? (
        <p className="text-center text-red-600 font-semibold">
          You must{" "}
          <Link to="/user-auth" className="text-indigo-500 underline hover:text-indigo-400 transition">
            log in
          </Link>{" "}
          to post.
        </p>
      ) : (
        <section className="border-t border-gray-700 pt-6">
          <h2 className="text-xl font-semibold mb-4">Add a Post</h2>
          <textarea
            className="w-full min-h-[120px] p-4 rounded-md bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder="Write your message here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
          />
          <button
            onClick={submitPost}
            disabled={submitting || !content.trim()}
            className={`mt-4 w-full py-3 rounded-md font-semibold transition ${
              submitting || !content.trim()
                ? "bg-indigo-700 cursor-not-allowed text-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </section>
      )}
    </div>
  )
}
