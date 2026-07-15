import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { me } from '../api/auth'

interface User {
  id: string
  fullName: string
  username: string
  email: string
  role: 'admin' | 'manager' | 'operator'
  status: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      me()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const setAuth = (t: string, u: User) => {
    localStorage.setItem('token', t)
    setToken(t)
    setUser(u)
  }

  const clearAuth = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, clearAuth, isAdmin: user?.role === 'admin', loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
