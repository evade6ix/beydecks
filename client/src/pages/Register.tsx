// File: src/pages/Register.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function Register() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await res.json()

    if (res.ok) {
      setMessage("✅ Registered successfully!")
    } else {
      setError(data?.error || "Registration failed")
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-zinc-900 rounded shadow text-white">
      <h2 className="text-2xl font-bold mb-4">Create an Account</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="border p-2 rounded bg-black text-white"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="border p-2 rounded bg-black text-white"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 rounded bg-black text-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-400">{error}</p>}
        {message && (
          <div className="text-green-400">
            <p>{message}</p>
            <button
              className="underline mt-2"
              onClick={() => navigate("/user-login")}
              type="button"
            >
              Go to Login
            </button>
          </div>
        )}
        {!message && (
          <button type="submit" className="bg-blue-600 text-white py-2 rounded">
            Register
          </button>
        )}
      </form>
    </div>
  )
}
