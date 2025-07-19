import { createClient } from '@supabase/supabase-js'

export interface DashboardStats {
  totalPurchases: number
  totalSpent: number
  wishlistItems: number
  downloadedItems: number
}

export interface SellerStats {
  totalProducts: number
  totalSales: number
  totalEarnings: number
  pendingWithdrawal: number
}

export interface RecentPurchase {
  id: string
  title: string
  author: string
  price: number
  date: string
  status: string
}

export interface RecentProduct {
  id: string
  title: string
  price: number
  sales: number
  earnings: number
  status: string
}

export class DashboardService {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    // Use service role key to bypass RLS policies
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async getUserStats(userId: string): Promise<DashboardStats> {
    try {
      console.log('[DASHBOARD SERVICE] Fetching user stats for:', userId)
      
      // Get total purchases (paid orders)
      const { data: orders, error: ordersError } = await this.supabase
        .from('orders')
        .select('total_amount, status')
        .eq('user_id', userId)
        .eq('status', 'paid')

      console.log('[DASHBOARD SERVICE] Orders query result:', { orders, ordersError })

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        return {
          totalPurchases: 0,
          totalSpent: 0,
          wishlistItems: 0,
          downloadedItems: 0,
        }
      }

      const totalPurchases = orders?.length || 0
      const totalSpent = orders?.reduce((sum: number, order: { total_amount: number }) => sum + order.total_amount, 0) || 0

      console.log('[DASHBOARD SERVICE] Calculated stats:', { totalPurchases, totalSpent })

      // Get wishlist items (assuming there's a wishlist table)
      const { data: wishlistItems } = await this.supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)

      const wishlistCount = wishlistItems?.length || 0

      // Get downloaded items (from downloads table)
      const { data: downloads } = await this.supabase
        .from('downloads')
        .select('id')
        .eq('user_id', userId)

      const downloadedCount = downloads?.length || 0

      return {
        totalPurchases,
        totalSpent,
        wishlistItems: wishlistCount,
        downloadedItems: downloadedCount,
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        totalPurchases: 0,
        totalSpent: 0,
        wishlistItems: 0,
        downloadedItems: 0,
      }
    }
  }

  async getSellerStats(userId: string): Promise<SellerStats> {
    try {
      // Get total products
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, price')
        .eq('seller_id', userId)
        .eq('status', 'active')

      if (productsError) {
        console.error('Error fetching products:', productsError)
        return {
          totalProducts: 0,
          totalSales: 0,
          totalEarnings: 0,
          pendingWithdrawal: 0,
        }
      }

      const totalProducts = products?.length || 0

      // Get total sales and earnings from order_items
      const { data: orderItems, error: orderItemsError } = await this.supabase
        .from('order_items')
        .select('price, quantity, seller_earnings, orders!inner(status)')
        .eq('seller_id', userId)
        .eq('orders.status', 'paid')

      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError)
        return {
          totalProducts,
          totalSales: 0,
          totalEarnings: 0,
          pendingWithdrawal: 0,
        }
      }

      const totalSales = orderItems?.length || 0
      const totalEarnings = orderItems?.reduce((sum: number, item: { seller_earnings: number }) => sum + (item.seller_earnings || 0), 0) || 0

      // Get pending withdrawals
      const { data: withdrawals } = await this.supabase
        .from('withdrawals')
        .select('amount')
        .eq('seller_id', userId)
        .in('status', ['pending', 'approved'])

      const pendingWithdrawal = withdrawals?.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0) || 0

      return {
        totalProducts,
        totalSales,
        totalEarnings,
        pendingWithdrawal,
      }
    } catch (error) {
      console.error('Error fetching seller stats:', error)
      return {
        totalProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        pendingWithdrawal: 0,
      }
    }
  }

  async getRecentPurchases(userId: string): Promise<RecentPurchase[]> {
    try {
      console.log('[DASHBOARD SERVICE] Fetching recent purchases for user:', userId)
      
      // Get order items with order details (simplified query)
      const { data: orderItems, error: orderItemsError } = await this.supabase
        .from('order_items')
        .select(`
          id,
          product_title,
          price,
          created_at,
          seller_id,
          orders!inner(
            user_id,
            status,
            created_at
          )
        `)
        .eq('orders.user_id', userId)
        .eq('orders.status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('[DASHBOARD SERVICE] Order items result:', { orderItems, orderItemsError })

      if (orderItemsError || !orderItems) {
        console.error('Error fetching order items:', orderItemsError)
        return []
      }

      // Map the data to RecentPurchase format
      return orderItems.map((item: any) => {
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders

        return {
          id: item.id,
          title: item.product_title,
          author: 'Jual Digital', // Since we can't get seller info easily, use a default
          price: item.price,
          date: new Date(order.created_at).toLocaleDateString('id-ID'),
          status: 'completed',
        }
      })
    } catch (error) {
      console.error('Error fetching recent purchases:', error)
      return []
    }
  }

  async getRecentProducts(userId: string): Promise<RecentProduct[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          total_sales,
          seller_earnings
        `)
        .eq('seller_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent products:', error)
        return []
      }

      return products?.map((product: any) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        sales: product.total_sales || 0,
        earnings: product.seller_earnings || 0,
        status: 'active',
      })) || []
    } catch (error) {
      console.error('Error fetching recent products:', error)
      return []
    }
  }
} 