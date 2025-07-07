"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"

// Extended User type with custom properties
interface ExtendedUser extends User {
  name?: string
  avatar?: string
  role?: string
}

interface AuthContextType {
  user: ExtendedUser | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void> // Alias for signOut for backward compatibility
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("Login response:", { error, data })
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error("Login error:", error)
      throw new Error("Login failed")
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })
      console.log("Signup response:", { error, data })
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error("Signup error:", error)
      throw new Error("Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const logout = signOut // Alias for backward compatibility

  return <AuthContext.Provider value={{ user, login, register, signOut, logout, loading }}>{children}</AuthContext.Provider>
}
