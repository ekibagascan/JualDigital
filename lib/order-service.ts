import { SupabaseClient } from '@supabase/supabase-js'
// Xendit integration removed - using manual payment instead
// import { createInvoice } from './xendit'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { getPaymentSettings } from './settings-service'
import { createDanaOrder } from './dana'
import { createCryptoPayment } from './bci-payment'

export interface OrderItem {
  product_id: string
  seller_id: string
  title: string
  price: number
  quantity: number
  image_url?: string
}

export interface CreateOrderRequest {
  user_id?: string
  guest_name?: string
  guest_email?: string
  user_phone?: string
  guest_phone?: string
  items: OrderItem[]
  total_amount: number
  tax_amount: number
  payment_method: string
  note?: string // Add note field
}

export interface Order {
  id: string
  order_number: string
  user_id?: string
  guest_name?: string
  guest_email?: string
  total_amount: number
  tax_amount: number
  platform_fee: number
  status: string
  payment_method: string
  payment_provider: string
  payment_id?: string
  transaction_id?: string
  invoice_url?: string
  created_at: string
  updated_at: string
}

interface OrderItemWithSeller {
  order_id: string
  product_id: string
  seller_id: string
  product_title: string
  product_image?: string
  price: number
  quantity: number
  seller_earnings: number
}

export class OrderService {
  private supabase: SupabaseClient
  private whatsappService: WhatsAppService

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.whatsappService = new WhatsAppService()
  }


  async createOrder(orderData: CreateOrderRequest): Promise<{ order: Order; paymentUrl?: string }> {
    try {
      // Validate that user is not trying to purchase their own products
      if (orderData.user_id) {
        const productIds = orderData.items.map(item => item.product_id)
        const { data: products, error: productsError } = await this.supabase
          .from('products')
          .select('id, seller_id, title')
          .in('id', productIds)

        if (productsError) {
          console.error('Error fetching products for validation:', productsError)
          throw new Error('Failed to validate order items')
        }

        // Check if any product belongs to the current user
        const ownProducts = products.filter(product => product.seller_id === orderData.user_id)
        if (ownProducts.length > 0) {
          const productNames = ownProducts.map(p => p.title || p.id).join(', ')
          throw new Error(`You cannot purchase your own products. Please remove: ${productNames}`)
        }
      }

      // 1. Get payment settings
      const paymentSettings = await getPaymentSettings(this.supabase)
      console.log('[ORDER CREATION] Payment settings:', paymentSettings)
      console.log('[ORDER CREATION] Order data payment_method:', orderData.payment_method)

      // Determine which payment method to use based on user selection or default
      const paymentMethodValue = orderData.payment_method?.toLowerCase()
      const selectedPaymentType =
        paymentMethodValue === 'crypto' || paymentMethodValue?.startsWith('crypto_') ? 'crypto' :
          paymentMethodValue === 'fiat' || paymentMethodValue?.startsWith('fiat_') ? 'fiat' :
            paymentSettings.defaultMethod

      console.log('[ORDER CREATION] Selected payment type:', selectedPaymentType)

      const useCrypto = selectedPaymentType === 'crypto' && paymentSettings.cryptoEnabled
      const useFiat = selectedPaymentType === 'fiat' && paymentSettings.fiatEnabled

      console.log('[ORDER CREATION] useCrypto:', useCrypto, 'useFiat:', useFiat)

      // Fallback if selected method is not enabled - prioritize fiat
      const finalPaymentType = useFiat ? 'fiat' :
        useCrypto ? 'crypto' :
          'fiat' // Always default to fiat if nothing is enabled

      const paymentMethod = finalPaymentType === 'crypto' ? 'bci' :
        paymentSettings.fiatMethod

      console.log('[ORDER CREATION] Final payment type:', finalPaymentType)
      console.log('[ORDER CREATION] Payment method:', paymentMethod)

      // 2. Create order in Supabase
      // IMPORTANT: If user_id is provided, it should NOT be null/undefined
      // Only set guest fields if user_id is NOT provided
      const orderInsertData: {
        user_id: string | null
        guest_name: string | null
        guest_email: string | null
        total_amount: number
        tax_amount: number
        platform_fee: number
        status: string
        payment_method: string
        payment_provider: string
        note: string | null
      } = {
        user_id: orderData.user_id || null,
        guest_name: orderData.user_id ? null : (orderData.guest_name || null), // Only set if no user_id
        guest_email: orderData.user_id ? null : (orderData.guest_email || null), // Only set if no user_id
        total_amount: orderData.total_amount,
        tax_amount: orderData.tax_amount,
        platform_fee: 0, // No platform fee for now
        status: 'pending',
        payment_method: orderData.payment_method || 'BANK_TRANSFER',
        payment_provider: paymentMethod, // Use configured payment method
        note: orderData.note || null, // Add note if provided
      }

      console.log('[ORDER CREATION] Inserting order with:', {
        user_id: orderInsertData.user_id,
        has_guest_email: !!orderInsertData.guest_email,
        has_guest_name: !!orderInsertData.guest_name,
        is_guest_order: !orderInsertData.user_id
      })

      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw new Error('Failed to create order')
      }

      console.log('[ORDER CREATION] Created order with ID:', order.id)
      console.log('[ORDER CREATION] Order number:', order.order_number)
      console.log('[ORDER CREATION] Payment provider:', paymentMethod)

      // 3. Fetch products to get seller_id and title
      const productIds = orderData.items.map(item => item.product_id)
      console.log('Fetching products with IDs:', productIds)

      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, seller_id, title')
        .in('id', productIds)

      if (productsError) {
        console.error('Error fetching products for order items:', productsError)
        throw new Error('Failed to fetch product data for order')
      }

      console.log('Fetched products:', products)
      console.log('Products found:', products?.length || 0)
      console.log('Product IDs requested:', productIds)
      console.log('Product IDs found:', products?.map(p => p.id) || [])

      const productMap = Object.fromEntries(products.map(p => [p.id, p]))
      console.log('Product map:', productMap)

      // 4. Create order items
      const orderItems = orderData.items.map(item => {
        const product = productMap[item.product_id]
        return {
          order_id: order.id,
          product_id: item.product_id,
          seller_id: product?.seller_id,
          product_title: product?.title,
          product_image: item.image_url,
          price: item.price,
          quantity: item.quantity,
          seller_earnings: item.price * item.quantity * 0.97, // 3% commission
        }
      })

      console.log('Order items payload:', orderItems)

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        throw new Error('Failed to create order items')
      }

      // WhatsApp notifications will be sent after payment is successful via webhook
      // await this.sendSellerNotifications(order.id, orderItems, order.order_number, orderData)

      // 5. Create payment based on payment method
      let paymentUrl: string | undefined

      if (finalPaymentType === 'crypto' && paymentMethod === 'bci') {
        // Create BCI crypto payment
        const totalAmount = Math.round(orderData.total_amount + orderData.tax_amount)

        const productTitles = orderData.items.map(item => item.title).join(', ')
        const description = productTitles.length > 100
          ? productTitles.substring(0, 97) + '...'
          : productTitles || 'Product purchase'

        try {
          const cryptoPayment = await createCryptoPayment({
            orderId: order.order_number,
            amount: totalAmount,
            token: 'IDRT', // Default to IDRT, can be made configurable
            description: description,
          })

          // Update order with BCI payment details
          const { error: updateError } = await this.supabase
            .from('orders')
            .update({
              payment_provider: 'bci',
              payment_method: 'CRYPTO',
              transaction_id: cryptoPayment.paymentId,
              invoice_url: cryptoPayment.paymentLink,
            })
            .eq('id', order.id)

          if (updateError) {
            console.error('Order update error:', updateError)
            throw new Error('Failed to update order with BCI payment')
          }

          console.log('[ORDER CREATION] Created BCI payment:', cryptoPayment.paymentId)
          paymentUrl = cryptoPayment.paymentLink
        } catch (cryptoError) {
          console.error('[ORDER CREATION] Error creating crypto payment:', cryptoError)
          throw new Error(`Failed to create crypto payment: ${cryptoError instanceof Error ? cryptoError.message : 'Unknown error'}`)
        }
      } else if (paymentMethod === 'dana') {
        // Create DANA hosted checkout order
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'

        const customerName = orderData.guest_name ||
          (orderData.user_id ? 'Customer' : 'Guest')
        const customerEmail = orderData.guest_email ||
          (orderData.user_id ? undefined : undefined)
        const customerPhone = orderData.guest_phone ||
          orderData.user_phone || undefined

        // Calculate total from items to ensure it matches
        const itemsTotal = Math.round(orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))

        // Prepare customer name (split first/last)
        const nameParts = customerName.split(' ')
        const firstName = nameParts[0] || customerName
        const lastName = nameParts.slice(1).join(' ') || undefined

        // Create DANA order
        const danaOrder = await createDanaOrder({
          partnerReferenceNo: order.order_number,
          merchantId: process.env.DANA_MERCHANT_ID || '',
          amount: {
            value: itemsTotal.toString(),
            currency: 'IDR',
          },
          scenario: 'REDIRECT',
          webRedirectUrl: `${baseUrl}/payment/dana/finish?order_id=${order.id}`,
          finishNotifyUrl: `${baseUrl}/api/payments/dana/callback`,
          customer: {
            firstName: firstName,
            lastName: lastName,
            email: customerEmail,
            phone: customerPhone,
          },
          orderItems: orderData.items.map(item => ({
            name: item.title.length > 100 ? item.title.substring(0, 97) + '...' : item.title,
            price: {
              value: Math.round(item.price).toString(),
              currency: 'IDR',
            },
            quantity: item.quantity,
          })),
        })

        // Update order with DANA transaction details
        const { error: updateError } = await this.supabase
          .from('orders')
          .update({
            payment_provider: 'dana',
            transaction_id: danaOrder.referenceNo || order.order_number,
            invoice_url: danaOrder.webRedirectUrl,
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Order update error:', updateError)
          throw new Error('Failed to update order with DANA transaction')
        }

        console.log('[ORDER CREATION] Created DANA order:', danaOrder.referenceNo)
        paymentUrl = danaOrder.webRedirectUrl
      } else if (paymentMethod === 'manual') {
        // Manual payment
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
        paymentUrl = `${baseUrl}/payment/instructions?order_id=${order.id}`

        // Update order with payment instructions URL
        const { error: updateError } = await this.supabase
          .from('orders')
          .update({
            payment_provider: 'manual',
            invoice_url: paymentUrl,
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Order update error:', updateError)
        } else {
          console.log('Order updated with manual payment instructions URL:', paymentUrl)
        }
      }

      return {
        order,
        paymentUrl,
      }
    } catch (error) {
      console.error('Order service error:', error)
      throw error
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Get order error:', error)
        return null
      }

      return order
    } catch (error) {
      console.error('Get order error:', error)
      return null
    }
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get user orders error:', error)
        return []
      }

      return orders || []
    } catch (error) {
      console.error('Get user orders error:', error)
      return []
    }
  }

  async updateOrderStatus(orderId: string, status: string, paymentId?: string): Promise<void> {
    try {
      const updateData: { status: string; payment_id?: string } = { status }
      if (paymentId) {
        updateData.payment_id = paymentId
      }

      const { error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      console.log('[ORDER UPDATE] Attempted to update order:', orderId)
      console.log('[ORDER UPDATE] Update data:', updateData)
      if (error) {
        console.error('Update order status error:', error)
        throw new Error('Failed to update order status')
      }
      console.log('[ORDER UPDATE] Update successful')
    } catch (error) {
      console.error('Update order status error:', error)
      throw error
    }
  }

  async getOrderItems(orderId: string) {
    try {
      const { data: items, error } = await this.supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) {
        console.error('Get order items error:', error)
        return []
      }

      return items || []
    } catch (error) {
      console.error('Get order items error:', error)
      return []
    }
  }

  private async sendSellerNotifications(orderId: string, orderItems: OrderItemWithSeller[], orderNumber: string, orderData: CreateOrderRequest) {
    try {
      // Get order status
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('[WHATSAPP] Could not fetch order status:', orderError)
        return
      }

      // Group items by seller to send one notification per seller
      const sellerGroups = new Map<string, OrderItemWithSeller[]>()

      for (const item of orderItems) {
        if (!sellerGroups.has(item.seller_id)) {
          sellerGroups.set(item.seller_id, [])
        }
        sellerGroups.get(item.seller_id)!.push(item)
      }

      // Send notification to each seller
      for (const [sellerId, items] of sellerGroups) {
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const productTitles = items.map(item => item.product_title).join(', ')
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

        // Get buyer name if available
        let buyerName: string | undefined
        if (orderData.user_id) {
          try {
            const { data: user } = await this.supabase.auth.admin.getUserById(orderData.user_id)
            buyerName = user?.user?.user_metadata?.name || user?.user?.email
          } catch (error) {
            console.log('[WHATSAPP] Could not fetch buyer name:', error)
          }
        }

        await this.whatsappService.sendOrderNotification(sellerId, {
          orderNumber,
          productTitle: productTitles,
          amount: totalAmount,
          buyerName,
          quantity: totalQuantity,
          note: orderData.note,
          paymentStatus: order?.status || 'pending'
        })
      }
    } catch (error) {
      console.error('[WHATSAPP] Error sending seller notifications:', error)
      // Don't throw error to avoid breaking order creation
    }
  }
} 