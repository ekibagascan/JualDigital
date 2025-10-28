"use client"

import React from "react"
import type { User } from "@supabase/supabase-js"
import { AuthProvider } from "@/components/providers/auth-provider"
import { CartProvider } from "@/components/providers/cart-provider"

export function ClientProviders({ children, initialUser }: { children: React.ReactNode, initialUser?: User | null }) {
    return (
        <AuthProvider initialUser={initialUser}>
            <CartProvider>
                {children}
            </CartProvider>
        </AuthProvider>
    )
} 