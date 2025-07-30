import { createContext, useContext, useEffect, useState } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Tournament {
  storeName: string
  date: string
  totalPlayers: number
  roundWins: number
  roundLosses: number
  placement: string
}

export interface User {

  id: string
  username: string
  email: string
  profileImage?: string
  badge?: string
  role: "admin" | "storeAdmin"
  storeAccess?: {
    storeId: string
    storeName: string
    country: string
    region: string
    city: string
  }   
  tournamentsPlayed: Tournament[]
  matchupHistory: {
    myCombo: {
      blade: string
      ratchet: string
      bit: string
      notes?: string
    }
    opponentCombo: {
      blade: string
      ratchet: string
      bit: string
      notes?: string
    }
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
  localStorage.setItem("user", JSON.stringify(userData)) // ✅ Save initial user
  setToken(jwt)

  setUser({
    ...userData,
    tournamentsPlayed: userData.tournamentsPlayed ?? [],
    matchupHistory: userData.matchupHistory ?? [],
  })

  fetch(`${API}/auth/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Token invalid or expired")
      return res.json()
    })
    .then((verified) => {
      setUser({
        ...verified,
        tournamentsPlayed: verified.tournamentsPlayed ?? [],
        matchupHistory: verified.matchupHistory ?? [],
      })
      localStorage.setItem("user", JSON.stringify(verified)) // ✅ Save verified user
    })
    .catch(() => logout())
    .finally(() => setLoading(false))
}


  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    setToken(null)
  }

  useEffect(() => {
    const stored = localStorage.getItem("token")
    if (stored) {
      setToken(stored)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } else {
      setLoading(false)
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
