"use client"

import React from "react"
import { AuthProvider } from "@/components/providers/auth-provider"
import { CartProvider } from "@/components/providers/cart-provider"

export function ClientProviders({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) {
    return (
        <AuthProvider initialUser={initialUser}>
            <CartProvider>
                {children}
            </CartProvider>
        </AuthProvider>
    )
} 