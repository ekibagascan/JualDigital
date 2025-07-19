import { SupabaseClient } from '@supabase/supabase-js'
import { createInvoice } from './xendit'

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

export class OrderService {
  constructor(private supabase: SupabaseClient) {}



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

      // 1. Create order in Supabase
      
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
          payment_method: orderData.payment_method,
          payment_provider: 'xendit',
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

      // 2. Fetch products to get seller_id and title
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

      // 3. Create order items
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
          seller_earnings: item.price * item.quantity * 0.9, // 90% to seller, 10% platform fee
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

      // 4. Create Xendit invoice (hosted checkout page)
      const invoiceItems = orderItems.map(item => ({
        name: item.product_title,
        quantity: item.quantity,
        price: item.price,
      }))

      // Get user email if user_id is provided
      let payerEmail = orderData.guest_email || 'guest@example.com'
      if (orderData.user_id) {
        try {
          const { data: user } = await this.supabase.auth.admin.getUserById(orderData.user_id)
          if (user && user.user && user.user.email) {
            payerEmail = user.user.email
          }
        } catch (error) {
          console.log('[ORDER CREATION] Could not fetch user email, using fallback:', error)
        }
      }

      const invoiceData = {
        external_id: order.id,
        amount: orderData.total_amount + orderData.tax_amount,
        payer_email: payerEmail,
        description: `Order ${order.order_number} - Digital Products`,
        items: invoiceItems,
        should_send_email: false,
        success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/payment/success?order_id=${order.id}`,
        failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/payment/failed?order_id=${order.id}`,
        currency: 'IDR',
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/api/payments/callback`,
      }
      console.log('[XENDIT INVOICE DEBUG] Invoice request:', invoiceData)
      console.log('[XENDIT INVOICE DEBUG] External ID being sent to Xendit:', order.id)
      const invoiceResponse = await createInvoice(invoiceData)
      console.log('[XENDIT INVOICE DEBUG] Full invoiceResponse:', invoiceResponse)

      // 5. Update order with invoice info
      const { error: updateError } = await this.supabase
        .from('orders')
        .update({
          payment_id: invoiceResponse.id,
          transaction_id: invoiceResponse.id,
          invoice_url: invoiceResponse.invoice_url,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Order update error:', updateError)
      } else {
        console.log('Order updated with invoice_url:', invoiceResponse.invoice_url)
      }

      return {
        order,
        paymentUrl: invoiceResponse.invoice_url,
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
} 