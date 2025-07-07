"use client"

import React from "react"
import { AuthProvider as AuthContextProvider } from "@/hooks/use-auth"
import { useSupabaseCart } from "@/hooks/use-supabase-cart"
import { useAuth } from "@/hooks/use-auth"

interface AuthProviderProps {
  children: React.ReactNode
}

function AuthProviderWrapper({ children }: AuthProviderProps) {
  const { user } = useAuth()
  const { clearCart } = useSupabaseCart()

  // Clear cart when user logs out
  React.useEffect(() => {
    if (!user) {
      clearCart()
    }
  }, [user, clearCart])

  return <>{children}</>
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthContextProvider>
      <AuthProviderWrapper>
        {children}
      </AuthProviderWrapper>
    </AuthContextProvider>
  )
}
