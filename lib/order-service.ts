import { SupabaseClient } from '@supabase/supabase-js'
// Xendit integration removed - using manual payment instead
// import { createInvoice } from './xendit'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { getPaymentMethodSetting } from './settings-service'
import { createSnapTransaction } from './midtrans'

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

      // 1. Get payment method setting
      const paymentMethod = await getPaymentMethodSetting(this.supabase)
      console.log('[ORDER CREATION] Payment method setting:', paymentMethod)

      // 2. Create order in Supabase
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id || null,
          guest_name: orderData.guest_name || null,
          guest_email: orderData.guest_email || null,
          total_amount: orderData.total_amount,
          tax_amount: orderData.tax_amount,
          platform_fee: 0, // No platform fee for now
          status: 'pending',
          payment_method: orderData.payment_method || 'BANK_TRANSFER',
          payment_provider: paymentMethod, // Use configured payment method
          note: orderData.note || null, // Add note if provided
        })
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

      if (paymentMethod === 'midtrans') {
        // Create Midtrans Snap transaction
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
        
        const customerName = orderData.guest_name || 
          (orderData.user_id ? 'Customer' : 'Guest')
        const customerEmail = orderData.guest_email || 
          (orderData.user_id ? undefined : undefined)
        const customerPhone = orderData.guest_phone || 
          orderData.user_phone || undefined

        // Calculate total from items to ensure it matches
        const itemsTotal = orderData.items.reduce((sum, item) => sum + (Math.round(item.price) * item.quantity), 0)
        
        const snapTransaction = await createSnapTransaction({
          transaction_details: {
            order_id: order.order_number, // Use order_number as Midtrans order_id
            gross_amount: itemsTotal, // Use calculated total from items
          },
          customer_details: {
            first_name: customerName.split(' ')[0] || customerName,
            last_name: customerName.split(' ').slice(1).join(' ') || undefined,
            email: customerEmail,
            phone: customerPhone,
          },
          item_details: orderData.items.map(item => ({
            id: item.product_id,
            price: Math.round(item.price),
            quantity: item.quantity,
            name: item.title.length > 50 ? item.title.substring(0, 47) + '...' : item.title,
          })),
          callbacks: {
            finish: `${baseUrl}/payment/midtrans/finish?order_id=${order.id}`,
            error: `${baseUrl}/payment/midtrans/error?order_id=${order.id}`,
            pending: `${baseUrl}/payment/midtrans/pending?order_id=${order.id}`,
          },
        })

        // Update order with Midtrans transaction token
        const { error: updateError } = await this.supabase
          .from('orders')
          .update({
            payment_provider: 'midtrans',
            transaction_id: snapTransaction.token,
            invoice_url: snapTransaction.redirect_url,
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Order update error:', updateError)
          throw new Error('Failed to update order with Midtrans transaction')
        }

        console.log('Order updated with Midtrans transaction token:', snapTransaction.token)
        paymentUrl = snapTransaction.redirect_url
      } else {
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