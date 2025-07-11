"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from '@/lib/supabase-client'
import { useAuth } from "@/hooks/use-auth"

export interface SupabaseWishlistItem {
  id: string
  product_id: string
  user_id: string
  created_at: string
}

export function useSupabaseWishlist() {
  const { user } = useAuth()
  const [items, setItems] = useState<SupabaseWishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch wishlist on login
  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const fetchWishlist = async () => {
      const { data: wishlistItems } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
      setItems(wishlistItems || [])
      setLoading(false)
    }
    fetchWishlist()
  }, [user])

  // Add to wishlist
  const addToWishlist = useCallback(async (product_id: string) => {
    if (!user) return
    // Prevent duplicates
    if (items.some(item => item.product_id === product_id)) return
    const { data, error } = await supabase
      .from("wishlist")
      .insert({ user_id: user.id, product_id })
      .select("*")
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data])
    }
  }, [user, items, supabase])

  // Remove from wishlist
  const removeFromWishlist = useCallback(async (product_id: string) => {
    if (!user) return
    await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product_id)
    setItems(prev => prev.filter(i => i.product_id !== product_id))
  }, [user, supabase])

  // Check if product is in wishlist
  const isInWishlist = (product_id: string) => items.some(item => item.product_id === product_id)

  return {
    items,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    loading,
  }
} 