// AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export type OwnedParts = {
  blades: string[]
  assistBlades?: string[]
  ratchets: string[]
  bits: string[]
}

interface Tournament {
  storeName: string
  date: string
  totalPlayers: number
  roundWins: number
  roundLosses: number
  placement: string
}

interface User {
  id: string
  username: string
  email: string

  // ✅ New optional profile fields
  displayName?: string
  avatarDataUrl?: string
  bio?: string
  homeStore?: string
  ownedParts?: OwnedParts
  slug?: string

  profileImage?: string
  tournamentsPlayed: Tournament[]
  matchupHistory: {
    myCombo: { blade: string; ratchet: string; bit: string; notes?: string }
    opponentCombo: { blade: string; ratchet: string; bit: string; notes?: string }
    result: "win" | "loss"
  }[]
  topCutCount: number
  firsts: number
  seconds: number
  thirds: number
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const login = (jwt: string, userData: User) => {
    localStorage.setItem("token", jwt)
    localStorage.setItem("user", JSON.stringify(userData))
    setToken(jwt)

    // ensure arrays exist
    setUser({
      ...userData,
      tournamentsPlayed: userData.tournamentsPlayed ?? [],
      matchupHistory: userData.matchupHistory ?? [],
    })

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid or expired")
        return res.json()
      })
      .then((verified) => {
        const normalized: User = {
          ...verified,
          tournamentsPlayed: verified.tournamentsPlayed ?? [],
          matchupHistory: verified.matchupHistory ?? [],
        }
        setUser(normalized)
        localStorage.setItem("user", JSON.stringify(normalized))
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setToken(null)
  }

  useEffect(() => {
    const stored = localStorage.getItem("token")
    if (stored) setToken(stored)
    else setLoading(false)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid or expired")
        return res.json()
      })
      .then((data) =>
        setUser({
          ...data,
          tournamentsPlayed: data.tournamentsPlayed ?? [],
          matchupHistory: data.matchupHistory ?? [],
        })
      )
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [token])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
