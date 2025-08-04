"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase-client"
import type { User, Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: object | undefined) => Promise<void>
  signOut: () => Promise<void>
  signInWithProvider: (provider: "github" | "google") => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Session error:', error)
        // Clear any corrupted session data
        setSession(null)
        setUser(null)
        setLoading(false)

        // Clear corrupted cookies if they exist
        if (typeof window !== 'undefined') {
          try {
            document.cookie.split(";").forEach(function (c) {
              const eqPos = c.indexOf("=");
              const name = eqPos > -1 ? c.substr(0, eqPos) : c;
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
          } catch (e) {
            console.error('Error clearing cookies:', e)
          }
        }
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle session expiration and sign out
        if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            // Don't redirect if already on login/register pages or public pages
            if (!currentPath.includes('/login') &&
              !currentPath.includes('/register') &&
              !currentPath.includes('/auth') &&
              !currentPath.includes('/cart') && // Allow cart access
              !currentPath.includes('/produk') && // Allow product browsing
              !currentPath.includes('/search')) { // Allow search
              // Store the current path to redirect back after login
              sessionStorage.setItem('redirectAfterLogin', currentPath)
              router.push("/login")
            }
          }
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [router])

  // Periodic session check to handle expired sessions
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        // Session expired or invalid
        setSession(null)
        setUser(null)
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          // Only redirect from protected pages, not public pages
          if (!currentPath.includes('/login') &&
            !currentPath.includes('/register') &&
            !currentPath.includes('/auth') &&
            !currentPath.includes('/cart') && // Allow cart access
            !currentPath.includes('/produk') && // Allow product browsing
            !currentPath.includes('/search') && // Allow search
            !currentPath.includes('/toko') && // Allow store pages
            !currentPath.includes('/categories') && // Allow category pages
            (currentPath.includes('/dashboard') ||
              currentPath.includes('/profile') ||
              currentPath.includes('/purchases') ||
              currentPath.includes('/wishlist') ||
              currentPath.includes('/seller'))) { // Only redirect from protected pages
            sessionStorage.setItem('redirectAfterLogin', currentPath)
            router.push("/login")
          }
        }
      }
    }

    // Check session every 10 minutes instead of 5 minutes
    const interval = setInterval(checkSession, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [router])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata?: object | undefined) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithProvider = async (provider: "github" | "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithProvider,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
