import { SupabaseClient } from '@supabase/supabase-js'
import { xenditAPI } from './xendit'

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

  async createOrderWithoutPayment(orderData: CreateOrderRequest): Promise<{ order: Order | null, error?: any }> {
    try {
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
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        return { order: null, error: orderError };
      }

      // 2. Fetch products to get seller_id
      const productIds = orderData.items.map(item => item.product_id)
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, seller_id')
        .in('id', productIds)

      if (productsError) {
        console.error('Error fetching products for order items:', productsError)
        return { order: null, error: productsError };
      }

      const productSellerMap = Object.fromEntries(products.map(p => [p.id, p.seller_id]))

      // 3. Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        seller_id: productSellerMap[item.product_id], // always from products table
        product_title: item.title,
        product_image: item.image_url,
        price: item.price,
        quantity: item.quantity,
        seller_earnings: item.price * item.quantity * 0.9, // 90% to seller, 10% platform fee
      }))

      console.log('Order items payload:', orderItems)

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        return { order: null, error: itemsError };
      }

      return { order };
    } catch (err) {
      console.error('Order service error:', err)
      return { order: null, error: err };
    }
  }

  async createOrder(orderData: CreateOrderRequest): Promise<{ order: Order; paymentUrl?: string }> {
    try {
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
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw new Error('Failed to create order')
      }

      // 2. Fetch products to get seller_id
      const productIds = orderData.items.map(item => item.product_id)
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, seller_id')
        .in('id', productIds)

      if (productsError) {
        console.error('Error fetching products for order items:', productsError)
        throw new Error('Failed to fetch product data for order')
      }

      const productSellerMap = Object.fromEntries(products.map(p => [p.id, p.seller_id]))

      // 3. Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        seller_id: productSellerMap[item.product_id], // always from products table
        product_title: item.title,
        product_image: item.image_url,
        price: item.price,
        quantity: item.quantity,
        seller_earnings: item.price * item.quantity * 0.9, // 90% to seller, 10% platform fee
      }))

      console.log('Order items payload:', orderItems)

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        throw new Error('Failed to create order items')
      }

      // 4. Create Xendit payment using v2 for all payment methods
      const paymentMethod = orderData.payment_method
      console.log('[DEBUG] Using Xendit v2 for payment method:', paymentMethod)
      
      // Validate phone number for payment methods that require it
      const phoneRequiredMethods = ['ASTRAPAY', 'SHOPEEPAY']
      if (phoneRequiredMethods.includes(paymentMethod) && !orderData.user_phone && !orderData.guest_phone) {
        throw new Error('Phone number is required for this payment method')
      }

      const customerName = orderData.user_id ? 'User' : (orderData.guest_name || 'Guest')
      const customerEmail = orderData.guest_email || 'guest@example.com'
      const customerPhone = orderData.user_phone || orderData.guest_phone

      const paymentData = {
        external_id: order.id,
        amount: orderData.total_amount + orderData.tax_amount,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        callback_url: `https://jualdigital.id/api/payments/callback`,
        redirect_url: `https://jualdigital.id/payment/success`,
        description: `Order ${order.order_number} - Digital Products`,
      }

      console.log('[XENDIT V2 DEBUG] Payment request:', paymentData)

      const paymentResponse = await xenditAPI.createPayment(paymentData)

      // 5. Update order with payment info
      const { error: updateError } = await this.supabase
        .from('orders')
        .update({
          payment_id: paymentResponse.id,
          transaction_id: paymentResponse.id,
          invoice_url: paymentResponse.checkout_url || paymentResponse.qr_code_url || paymentResponse.account_number || paymentResponse.payment_code,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Order update error:', updateError)
      }

      return {
        order,
        paymentUrl: paymentResponse.checkout_url || paymentResponse.qr_code_url || paymentResponse.account_number || paymentResponse.payment_code,
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
      const updateData: any = { status }
      if (paymentId) {
        updateData.payment_id = paymentId
      }

      const { error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) {
        console.error('Update order status error:', error)
        throw new Error('Failed to update order status')
      }
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