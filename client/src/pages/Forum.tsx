import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

interface ForumThread {
  event_id: number
  title: string
  created_at: string
}

export default function Forum() {
  const [threads, setThreads] = useState<ForumThread[]>([])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/forum`)
      .then(res => res.json())
      .then(data => setThreads(data))
      .catch(err => console.error("Failed to load forum threads", err))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">🗣 Event Discussions</h1>

      {threads.length === 0 ? (
        <p className="text-gray-600">No discussion threads yet.</p>
      ) : (
        <ul className="space-y-4">
          {threads.map(thread => (
            <li key={thread.event_id} className="border p-4 rounded-lg shadow">
              <Link to={`/forum/${thread.event_id}`} className="text-blue-600 hover:underline text-lg font-semibold">
                {thread.title}
              </Link>
              <p className="text-sm text-gray-500">Created: {new Date(thread.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
