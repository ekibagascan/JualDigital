"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
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
  const supabase = createClient()
  const [cartId, setCartId] = useState<string | null>(null)
  const [items, setItems] = useState<SupabaseCartItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch or create cart on login
  useEffect(() => {
    if (!user) {
      setCartId(null)
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const fetchOrCreateCart = async () => {
      try {
        // Try to fetch cart
        let { data: cart, error } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching cart:', error)
        }
        
        if (!cart) {
          // Create cart if not exists
          const { data: newCart, error: createError } = await supabase
            .from("carts")
            .insert({ user_id: user.id })
            .select("id")
            .single()
          
          if (createError) {
            console.error('Error creating cart:', createError)
            setLoading(false)
            return
          }
          
          cart = newCart
        }
        
        setCartId(cart?.id || null)
        
        // Fetch cart items
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
        console.error('Error in fetchOrCreateCart:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrCreateCart()
  }, [user])

  // Add item to cart
  const addItem = useCallback(async (item: Omit<SupabaseCartItem, "id" | "cart_id"> & { seller_id?: string }) => {
    if (!cartId) {
      console.error('No cart ID available')
      return
    }
    
    try {
      // Check if item already exists
      const existing = items.find(i => i.product_id === item.product_id)
      if (existing) {
        await updateQuantity(existing.id, existing.quantity + 1)
        return
      }
      
      // Try without seller_id first to see if that's the issue
      const cartItemData = {
        cart_id: cartId,
        product_id: item.product_id,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
        quantity: item.quantity,
      }
      
      console.log('Adding cart item:', cartItemData)
      console.log('Cart ID:', cartId)
      console.log('User ID:', user?.id)
      
      const { data, error } = await supabase
        .from("cart_items")
        .insert(cartItemData)
        .select("*")
        .single()
      
      if (error) {
        console.error('Error adding item to cart:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // If the error is about seller_id, try without it
        if (error.message?.includes('seller_id') || error.details?.includes('seller_id')) {
          console.log('Retrying without seller_id...')
          const cartItemDataWithoutSeller = {
            cart_id: cartId,
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            image_url: item.image_url,
            quantity: item.quantity,
          }
          
          const { data: retryData, error: retryError } = await supabase
            .from("cart_items")
            .insert(cartItemDataWithoutSeller)
            .select("*")
            .single()
          
          if (retryError) {
            console.error('Retry error:', retryError)
            throw retryError
          }
          
          if (retryData) {
            console.log('Successfully added item to cart (without seller_id):', retryData)
            setItems(prev => [...prev, retryData])
            return
          }
        }
        
        throw error
      }
      
      if (data) {
        console.log('Successfully added item to cart:', data)
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
        setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity } : i)))
      }
    } catch (error) {
      console.error('Error in updateQuantity:', error)
    }
  }, [supabase, removeItem])

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!cartId) return
    
    try {
      const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartId)
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
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    loading,
  }
} 