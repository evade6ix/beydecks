import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function Auth() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [userCache, setUserCache] = useState<any | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (isLoginMode) {
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) return setError(data.error || "Login failed")

        const token = data.token
        const user = userCache && userCache.username
          ? {
              ...userCache,
              tournamentsPlayed: userCache.tournamentsPlayed ?? [],
              matchupHistory: userCache.matchupHistory ?? [],
            }
          : await fetch(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((res) => res.json())

        login(token, user)
        navigate("/profile")
      } catch {
        setError("Something went wrong.")
      }
    } else {
      try {
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Registration failed")
          return
        }

        setMessage("✅ Registered successfully! You can now log in.")
        setUsername("")
        setEmail("")
        setPassword("")
        setIsLoginMode(true)
      } catch {
        setError("Something went wrong during registration.")
      }
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-zinc-900 rounded shadow text-white">
      <h2 className="text-2xl font-bold mb-6">{isLoginMode ? "User Login" : "Create an Account"}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLoginMode && (
          <input
            className="border p-2 rounded bg-black text-white"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          className="border p-2 rounded bg-black text-white"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="border p-2 rounded bg-black text-white"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isLoginMode && (

  <p className="text-right text-sm">
    <button
      type="button"
      onClick={() => navigate("/forgot-password")}
      className="text-blue-400 hover:text-blue-600 underline"
    >
      Forgot Password?
    </button>
  </p>
)}

        {error && <p className="text-red-400">{error}</p>}
        {message && <p className="text-green-400">{message}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {isLoginMode ? "Login" : "Register"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-400">
        {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          className="underline text-blue-400 hover:text-blue-600"
          onClick={() => {
            setIsLoginMode(!isLoginMode)
            setError("")
            setMessage("")
          }}
        >
          {isLoginMode ? "Register here" : "Login here"}
        </button>
      </p>
    </div>
  )
}
