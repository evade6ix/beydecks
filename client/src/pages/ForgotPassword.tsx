// forgotpassword.tsx
import { useState } from "react"

const RAW = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, "")
// strip a trailing /api from env if present, so we don’t get /api/api
const ROOT = RAW.replace(/\/api\/?$/i, "")
const api = (path: string) => `${ROOT}/api/${String(path).replace(/^\/+/, "")}`

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!email) return setError("Email is required.")
    setSending(true)
    setError(""); setMessage("")
    try {
      const res = await fetch(api("auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        // try to read a JSON error if the API provided one
        let msg = "Failed to send email."
        try {
          const data = await res.json()
          msg = data.error || data.message || msg
        } catch {}
        throw new Error(msg)
      }

      setMessage("✅ Reset link sent! Check your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <input
        type="email"
        className="input input-bordered w-full"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={sending}>
        {sending ? "Sending..." : "Send Reset Link"}
      </button>
      {message && <p className="text-green-500">{message}</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
