import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

interface Post {
  username: string
  content: string
  timestamp: string
  image?: string
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  useEffect(() => {
    setLoading(true)

    const fetchData = async () => {
      try {
        const forumRes = await fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`)

        if (forumRes.status === 404) {
          const eventRes = await fetch(`${import.meta.env.VITE_API_URL}/events/${id}`)
          if (!eventRes.ok) throw new Error("Event not found")
          const eventData = await eventRes.json()

          setThread({
            event_id: parseInt(id || ""),
            title: eventData.title || `Discussion for Event ${id}`,
            posts: [],
          })
        } else if (!forumRes.ok) {
          throw new Error("Failed to fetch forum thread")
        } else {
          const forumData = await forumRes.json()
          setThread(forumData)
        }
      } catch {
        setThread(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const submitPost = async () => {
    if (!user) return
    if (!content.trim()) return

    setSubmitting(true)
    let imageBase64 = ""
    if (selectedImage) {
      try {
        const reader = new FileReader()
        const fileAsBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedImage)
        })
        imageBase64 = fileAsBase64
      } catch (err) {
        console.error("Base64 encode failed:", err)
        alert("Failed to read image.")
        setSubmitting(false)
        return
      }
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL}/forum/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username || "Anonymous",
        content,
        image: imageBase64 || undefined,
      }),
    })

    setSubmitting(false)

    if (res.ok) {
      setContent("")
      setSelectedImage(null)
      setThread((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          posts: [
            ...prev.posts,
            {
              username: user.username || "Anonymous",
              content,
              image: imageBase64 || undefined,
              timestamp: new Date().toISOString(),
            },
          ],
        }
      })
    } else {
      alert("Failed to submit post. Please try again.")
    }
  }

  const deletePost = async (idx: number) => {
    if (!user) return
    if (!thread) return

    const confirmDelete = window.confirm("Are you sure you want to delete this post?")
    if (!confirmDelete) return

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/forum/${id}/post/${idx}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      }
    )

    if (res.ok) {
      setThread((prev) => {
        if (!prev) return prev
        const newPosts = [...prev.posts]
        newPosts.splice(idx, 1)
        return { ...prev, posts: newPosts }
      })
    } else {
      alert("Failed to delete post.")
    }
  }

  if (loading || authLoading)
    return <p className="p-4 text-center text-gray-300">Loading...</p>
  if (!thread)
    return <p className="p-4 text-center text-red-600">Thread not found.</p>

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
                <div className="flex items-center gap-2">
                  <time
                    className="text-xs text-gray-400"
                    dateTime={post.timestamp}
                    title={new Date(post.timestamp).toLocaleString()}
                  >
                    {new Date(post.timestamp).toLocaleDateString()}
                  </time>
                  {user?.username === post.username && (
                    <button
                      onClick={() => deletePost(idx)}
                      className="text-xs text-red-500 underline hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </header>
              <p className="whitespace-pre-wrap text-gray-200 mb-2">{post.content}</p>
              {post.image && (
                <img
                  src={post.image}
                  alt="Attached"
                  className="rounded-lg mt-2 max-h-80 object-contain"
                />
              )}
            </article>
          ))
        ) : (
          <p className="text-gray-500 italic text-center">
            No posts yet. Be the first to start the discussion!
          </p>
        )}
      </div>

      {!user ? (
        <p className="text-center text-red-600 font-semibold">
          You must{" "}
          <Link
            to="/user-auth"
            className="text-indigo-500 underline hover:text-indigo-400 transition"
          >
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
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Attach Image (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedImage(e.target.files[0])
                }
              }}
              className="block w-full text-sm text-gray-300 file:bg-indigo-600 file:border-none file:px-4 file:py-2 file:rounded-md file:text-white file:cursor-pointer"
            />
          </div>

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
