import { createClient } from '@/lib/supabase-client'
import { xenditAPI, XenditPaymentRequest } from './xendit'

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
  private supabase = createClient()

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

      // 4. Create Xendit payment
      const paymentRequest: XenditPaymentRequest = {
        amount: orderData.total_amount + orderData.tax_amount,
        currency: 'IDR',
        payment_method: orderData.payment_method,
        customer: {
          name: orderData.user_id ? 'User' : (orderData.guest_name || 'Guest'),
          email: orderData.guest_email || 'guest@example.com',
        },
        items: orderData.items.map(item => ({
          id: item.product_id,
          name: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
        order_id: order.order_number,
        description: `Order ${order.order_number} - Digital Products`,
      }

      const paymentResponse = await xenditAPI.createPayment(paymentRequest)

      // 5. Update order with payment info
      const { error: updateError } = await this.supabase
        .from('orders')
        .update({
          payment_id: paymentResponse.id,
          transaction_id: paymentResponse.transaction_id,
          invoice_url: paymentResponse.invoice_url,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Order update error:', updateError)
      }

      return {
        order,
        paymentUrl: paymentResponse.invoice_url,
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

export const orderService = new OrderService() 