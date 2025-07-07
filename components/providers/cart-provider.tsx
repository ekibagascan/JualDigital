"use client"

import React from "react"
import { createContext, useContext } from "react"
import { useSupabaseCart } from "@/hooks/use-supabase-cart"
import { useAuth } from "@/hooks/use-auth"

interface CartContextType {
  items: any[]
  addItem: (item: any & { seller_id?: string }) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getTotalPrice: () => number
  getTotalItems: () => number
  loading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabaseCart = useSupabaseCart()

  // If user is logged in, use Supabase cart
  // If not logged in, provide empty cart with login prompts
  const cartContext: CartContextType = user ? supabaseCart : {
    items: [],
    addItem: async () => {
      // Could show login prompt here
      console.log("Please login to add items to cart")
      throw new Error("Please login to add items to cart")
    },
    removeItem: async () => { },
    updateQuantity: async () => { },
    clearCart: async () => { },
    getTotalPrice: () => 0,
    getTotalItems: () => 0,
    loading: false,
  }

  return (
    <CartContext.Provider value={cartContext}>
      {children}
    </CartContext.Provider>
  )
}
