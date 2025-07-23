"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from "@/hooks/use-auth"

export interface SupabaseCartItem {
  id: string
  cart_id: string
  product_id: string
  variant_id?: string
  quantity: number
  added_at: string
  // Additional fields for display (not stored in DB)
  title?: string
  price?: number
  image_url?: string
  seller_id?: string
}

export function useSupabaseCart() {
  const { user } = useAuth()
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
        const { data: cart, error } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching cart:', error)
        }
        
        let currentCart = cart
        if (!currentCart) {
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
          
          currentCart = newCart
        }
        
        setCartId(currentCart?.id || null)
        
        // Fetch cart items
        if (currentCart?.id) {
          const { data: cartItems, error: itemsError } = await supabase
            .from("cart_items")
            .select("*")
            .eq("cart_id", currentCart.id)
          
          if (itemsError) {
            console.error('Error fetching cart items:', itemsError)
          }
          
          // Fetch product details for display
          if (cartItems && cartItems.length > 0) {
            const productIds = cartItems.map(item => item.product_id)
            const { data: products, error: productsError } = await supabase
              .from('products')
              .select('id, title, price, image_url, seller_id')
              .in('id', productIds)
            
            if (productsError) {
              console.error('Error fetching product details:', productsError)
            } else {
              const productMap = Object.fromEntries(products.map(p => [p.id, p]))
              const itemsWithProducts = cartItems.map(item => ({
                ...item,
                title: productMap[item.product_id]?.title,
                price: productMap[item.product_id]?.price,
                image_url: productMap[item.product_id]?.image_url,
                seller_id: productMap[item.product_id]?.seller_id,
              }))
              setItems(itemsWithProducts)
            }
          } else {
            setItems([])
          }
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
  const addItem = useCallback(async (item: { 
    product_id: string; 
    quantity?: number;
    title?: string;
    price?: number;
    image_url?: string;
    seller_id?: string;
  }) => {
    if (!cartId) {
      console.error('No cart ID available')
      return
    }
    
    try {
      // Check if item already exists
      const existing = items.find(i => i.product_id === item.product_id)
      if (existing) {
        await updateQuantity(existing.id, existing.quantity + (item.quantity || 1))
        return
      }
      
      const cartItemData = {
        cart_id: cartId,
        product_id: item.product_id,
        seller_id: item.seller_id,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
        quantity: item.quantity || 1,
        // added_at will default to NOW() in the DB
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
        throw error
      }
      
      if (data) {
        console.log('Successfully added item to cart:', data)
        // Add product details for display
        const newItem = {
          ...data,
          title: item.title,
          price: item.price,
          image_url: item.image_url,
          seller_id: item.seller_id,
        }
        setItems(prev => [...prev, newItem])
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
    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", id)
      if (error) {
        console.error('Error updating quantity:', error)
        return
      }
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i))
    } catch (error) {
      console.error('Error in updateQuantity:', error)
    }
  }, [supabase])

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      if (cartId) {
        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId)
        if (error) {
          console.error('Error clearing cart:', error)
          // Don't return, still clear local state
        }
        setItems([])
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Error in clearCart:', error)
      // Still clear local state even if DB operation fails
      setItems([])
    }
  }, [cartId, supabase])

  // Get total price
  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.price || 0
      return total + (price * item.quantity)
    }, 0)
  }, [items])

  // Get total items
  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

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