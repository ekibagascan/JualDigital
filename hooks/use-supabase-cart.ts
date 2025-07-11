"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from '@/lib/supabase-client'
import { useAuth } from "@/hooks/use-auth"

export interface SupabaseCartItem {
  id: string
  cart_id: string
  product_id: string
  seller_id?: string
  title: string
  price: number
  image_url: string
  quantity: number
}

export function useSupabaseCart() {
  const { user } = useAuth()
  const [cartId, setCartId] = useState<string | null>(null)
  const [items, setItems] = useState<SupabaseCartItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch cart on login (do not create cart automatically)
  useEffect(() => {
    if (!user) {
      setCartId(null)
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const fetchCart = async () => {
      try {
        // Only fetch cart, do not create
        let { data: cart, error } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single()
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching cart:', error)
        }
        setCartId(cart?.id || null)
        // Fetch cart items if cart exists
        if (cart?.id) {
          const { data: cartItems, error: itemsError } = await supabase
            .from("cart_items")
            .select("*")
            .eq("cart_id", cart.id)
          if (itemsError) {
            console.error('Error fetching cart items:', itemsError)
          }
          setItems(cartItems || [])
        } else {
          setItems([])
        }
      } catch (error) {
        console.error('Error in fetchCart:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCart()
  }, [user])

  // Add item to cart
  const addItem = useCallback(async (item: Omit<SupabaseCartItem, "id" | "cart_id"> & { seller_id?: string }) => {
    if (!user) {
      console.error('No user available')
      return
    }
    let currentCartId = cartId
    if (!currentCartId) {
      // Create cart only when adding first item
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single()
      if (createError) {
        console.error('Error creating cart:', createError)
        return
      }
      currentCartId = newCart.id
      setCartId(currentCartId)
    }
    try {
      // Check if item already exists
      const existing = items.find(i => i.product_id === item.product_id)
      if (existing) {
        await updateQuantity(existing.id, existing.quantity + 1)
        return
      }
      const cartItemData = {
        cart_id: currentCartId,
        product_id: item.product_id,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
        quantity: item.quantity,
      }
      const { data, error } = await supabase
        .from("cart_items")
        .insert(cartItemData)
        .select("*")
        .single()
      if (error) {
        console.error('Error adding item to cart:', error)
        throw error
      }
      if (data) {
        setItems(prev => [...prev, data])
      }
    } catch (error) {
      console.error('Error in addItem:', error)
      throw error
    }
  }, [cartId, items, supabase, user])

  // Remove item from cart
  const removeItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", id)
      if (error) {
        console.error('Error removing item from cart:', error)
        return
      }
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (error) {
      console.error('Error in removeItem:', error)
    }
  }, [supabase])

  // Update quantity
  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", id)
        .select("*")
        .single()
      
      if (error) {
        console.error('Error updating quantity:', error)
        return
      }
      
      if (data) {
        setItems(prev => prev.map(item => item.id === id ? data : item))
      }
    } catch (error) {
      console.error('Error in updateQuantity:', error)
    }
  }, [removeItem, supabase])

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!cartId) return
    
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId)
      
      if (error) {
        console.error('Error clearing cart:', error)
        return
      }
      
      setItems([])
    } catch (error) {
      console.error('Error in clearCart:', error)
    }
  }, [cartId, supabase])

  const getTotalPrice = () => items.reduce((total, item) => total + item.price * item.quantity, 0)
  const getTotalItems = () => items.reduce((total, item) => total + item.quantity, 0)

  return {
    items,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  }
} 