import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("")
  const [token, setToken] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get("token")
    if (tokenParam) setToken(tokenParam)
    else setError("No reset token found in URL.")
  }, [])

  const handleSubmit = async () => {
    if (!token) return setError("Missing token.")

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) return setError(data.error || "Reset failed.")

      setSuccess(true)
      setTimeout(() => navigate("/user-auth"), 3000)
    } catch {
      setError("Something went wrong.")
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Reset Your Password</h1>
      {success ? (
        <p className="text-green-400">✅ Password reset! Redirecting...</p>
      ) : (
        <>
          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="btn btn-primary w-full" onClick={handleSubmit}>
            Reset Password
          </button>
          {error && <p className="text-red-400">{error}</p>}
        </>
      )}
    </div>
  )
}
