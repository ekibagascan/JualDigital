"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase-client"
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
  register: (name: string, email: string, password: string) => Promise<void | { needsConfirmation: boolean }>
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
  return context as AuthContextType
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to ensure user profile exists and load avatar
  const ensureUserProfile = async (user: User) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Profile doesn't exist, create it with Google avatar if available
        const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: googleAvatar, // Add Google avatar
            role: 'user'
          })
        if (createError) {
          console.error('Error creating profile:', createError)
        }

        // Update user object with Google avatar and default role
        const extUser = user as ExtendedUser
        if (googleAvatar) {
          extUser.avatar = googleAvatar
        }
        extUser.role = 'user' // Set default role
      } else {
        // Profile exists, update user object with avatar AND role
        const extUser = user as ExtendedUser
        if (profile.avatar_url) {
          extUser.avatar = profile.avatar_url
        } else if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
          // If profile has no avatar but user has Google avatar, update profile
          const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
          extUser.avatar = googleAvatar

          // Update profile with Google avatar
          await supabase
            .from('profiles')
            .update({ avatar_url: googleAvatar })
            .eq('id', user.id)
        }

        // IMPORTANT: Set the role from the profile
        extUser.role = profile.role || 'user'
        console.log('User role loaded from profile:', extUser.role)
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[useAuth] getSession:', session)

        if (session?.user) {
          try {
            await ensureUserProfile(session.user)
          } catch (profileError) {
            console.error('[useAuth] Error in ensureUserProfile (getSession):', profileError)
          }
        }
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('[useAuth] Error in getSession:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] onAuthStateChange:', event, session)
        try {
          if (session?.user) {
            try {
              await ensureUserProfile(session.user)
            } catch (profileError) {
              console.error('[useAuth] Error in ensureUserProfile (onAuthStateChange):', profileError)
            }
          }
          setUser(session?.user ?? null)
        } catch (err) {
          console.error('[useAuth] Error in onAuthStateChange:', err)
          setUser(null)
        } finally {
          setLoading(false)
        }
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.jualdigital.id'}/auth/callback`,
        },
      })
      console.log("Signup response:", { error, data })
      if (error) {
        throw new Error(error.message)
      }
      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        return { needsConfirmation: true }
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
      console.log('[useAuth] Attempting to sign out...')

      // Clear local state immediately to prevent UI issues
      setUser(null)

      // Try to sign out from Supabase, but don't fail if session is missing
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.log('[useAuth] Sign out error (non-critical):', error.message)
          // Don't throw error for session missing - this is expected in some cases
        } else {
          console.log('[useAuth] Sign out successful')
        }
      } catch (signOutError) {
        console.log('[useAuth] Sign out failed (non-critical):', signOutError)
        // Don't throw error - we've already cleared local state
      }

      // Clear any stored tokens manually
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.removeItem('supabase.auth.token')
      }

    } catch (error) {
      console.error("Error in signOut:", error)
      // Always clear local state even if there's an error
      setUser(null)
    }
  }

  const logout = signOut // Alias for backward compatibility

  return <AuthContext.Provider value={{ user, login, register, signOut, logout, loading }}>{children}</AuthContext.Provider>
}
