// File: src/pages/StoreAdmin.tsx
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function StoreAdmin() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) return <Navigate to="/user-auth" />
  if (!user.storeAccess) return <Navigate to="/" />

  return (
    <div className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-4">🛠️ Store Admin Panel</h1>
      <p className="text-lg">Welcome, {user.username}! You have access to manage events for:</p>
      <p className="text-green-400 font-semibold mt-2">{user.storeAccess}</p>

      {/* 🔜 You'll insert event creation/editing here later */}
    </div>
  )
}
