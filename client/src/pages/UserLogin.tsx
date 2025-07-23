import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function UserLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [userCache, setUserCache] = useState<any | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) return setError(data.error || "Login failed")

      const token = data.token
      const user = userCache || (await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json()))

      login(token, user)
      navigate("/profile")
    } catch {
      setError("Something went wrong.")
    }
  }

  useEffect(() => {
    if (!email) {
      setUserCache(null)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/auth/user/${encodeURIComponent(email)}`)
        if (res.ok) {
          const data = await res.json()
          setUserCache(data)
        } else {
          setUserCache(null)
        }
      } catch {
        setUserCache(null)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [email])

  return (
    <form onSubmit={handleLogin} className="p-6 max-w-md mx-auto space-y-4 text-white">
      <h2 className="text-2xl font-bold">User Login</h2>
      {error && <p className="text-red-500">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 border rounded bg-black"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded bg-black"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">
        Log In
      </button>
    </form>
  )
}
