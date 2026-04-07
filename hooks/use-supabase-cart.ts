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
  variant_name?: string
  price?: number
  image_url?: string
  seller_id?: string
  telegram_enabled?: boolean
  delivery_method?: string | null
  tags?: string[] | null
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
              .select('id, title, price, image_url, seller_id, telegram_enabled, delivery_method, tags')
              .in('id', productIds)
            
            if (productsError) {
              console.error('Error fetching product details:', productsError)
            } else {
              const productMap = Object.fromEntries(products.map(p => [p.id, p]))
              const variantIds = [
                ...new Set(
                  cartItems
                    .map((ci) => ci.variant_id)
                    .filter((id): id is string => typeof id === "string" && id.length > 0),
                ),
              ]
              let variantById: Record<string, { price: number; name?: string | null }> = {}
              if (variantIds.length > 0) {
                const { data: variants, error: variantsError } = await supabase
                  .from("product_variants")
                  .select("id, price, name")
                  .in("id", variantIds)
                if (variantsError) {
                  console.error("Error fetching cart variant prices:", variantsError)
                } else {
                  variantById = Object.fromEntries(
                    (variants || []).map((v) => [
                      v.id,
                      { price: Number(v.price) || 0, name: v.name },
                    ]),
                  )
                }
              }
              const itemsWithProducts = cartItems.map(item => {
                const product = productMap[item.product_id]
                const variant = item.variant_id ? variantById[item.variant_id] : undefined
                const resolvedPrice = item.variant_id
                  ? variant != null
                    ? variant.price
                    : Number(item.price) || Number(product?.price) || 0
                  : Number(product?.price) || Number(item.price) || 0
                return {
                  ...item,
                  title: product?.title,
                  price: resolvedPrice,
                  image_url: product?.image_url,
                  seller_id: product?.seller_id, // Always get seller_id from products table
                  telegram_enabled: product?.telegram_enabled,
                  delivery_method: product?.delivery_method,
                  tags: product?.tags,
                  variant_name: variant?.name ?? item.variant_name,
                }
              })
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
  }, [])

  // Add item to cart
  const addItem = useCallback(async (item: { 
    product_id: string; 
    variant_id?: string;
    variant_name?: string;
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
      // Check if item already exists (considering variants)
      // Use loose equality for variant_id to handle null vs undefined
      const variantMatch = (a: string | null | undefined, b: string | null | undefined) => 
        (a || null) === (b || null)
      
      const existing = items.find(i => 
        i.product_id === item.product_id && 
        variantMatch(i.variant_id, item.variant_id)
      )
      if (existing) {
        await updateQuantity(existing.id, existing.quantity + (item.quantity || 1))
        return
      }
      
      // Ensure we have the seller_id by fetching product details if not provided
      let sellerId = item.seller_id
      if (!sellerId) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('seller_id')
          .eq('id', item.product_id)
          .single()
        
        if (productError) {
          console.error('Error fetching product seller_id:', productError)
        } else {
          sellerId = product.seller_id
        }
      }
      
      const cartItemData = {
        cart_id: cartId,
        product_id: item.product_id,
        variant_id: item.variant_id || null, // Normalize undefined to null for DB
        quantity: item.quantity || 1,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
        seller_id: sellerId,
      }
      
      const { data, error } = await supabase
        .from("cart_items")
        .insert(cartItemData)
        .select("*")
        .single()
      
      if (error) {
        // Handle 409 Conflict (duplicate) - item exists in DB but not in local state
        // This can happen due to race conditions or stale local state
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('conflict')) {
          console.log('Item already exists in cart, fetching and updating quantity...')
          
          // Fetch the existing item from DB
          let query = supabase
            .from("cart_items")
            .select("*")
            .eq("cart_id", cartId)
            .eq("product_id", item.product_id)
          
          if (item.variant_id) {
            query = query.eq("variant_id", item.variant_id)
          } else {
            query = query.is("variant_id", null)
          }
          
          const { data: existingItem } = await query.single()
          
          if (existingItem) {
            // Update quantity on the existing DB row
            const newQty = existingItem.quantity + (item.quantity || 1)
            await supabase
              .from("cart_items")
              .update({ quantity: newQty })
              .eq("id", existingItem.id)
            
            // Update local state
            setItems(prev => {
              const found = prev.find(i => i.id === existingItem.id)
              if (found) {
                return prev.map(i => i.id === existingItem.id ? { ...i, quantity: newQty } : i)
              }
              return [...prev, {
                ...existingItem,
                quantity: newQty,
                title: item.title,
                variant_name: item.variant_name,
                price: item.price,
                image_url: item.image_url,
                seller_id: sellerId,
              }]
            })
            return
          }
        }
        
        console.error('Error adding item to cart:', error)
        throw error
      }
      
      if (data) {
        const newItem = {
          ...data,
          title: item.title,
          variant_name: item.variant_name,
          price: item.price,
          image_url: item.image_url,
          seller_id: sellerId,
        }
        setItems(prev => [...prev, newItem])
      }
    } catch (error) {
      console.error('Error in addItem:', error)
      throw error
    }
  }, [cartId, items, updateQuantity])

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
  }, [])

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
  }, [cartId])

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