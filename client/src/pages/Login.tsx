// File: src/pages/Login.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = () => {
    if (password === "308f498ng8949vnvn4848jnv4jdkif") {
      onLogin()
      sessionStorage.setItem("admin", "true")
      navigate("/admin")
    } else {
      alert("Wrong password")
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <input
        type="password"
        className="input input-bordered w-full"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary w-full" onClick={handleLogin}>
        Login
      </button>
    </div>
  )
}
