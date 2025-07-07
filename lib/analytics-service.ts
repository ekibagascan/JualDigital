import { createClient } from '@/lib/supabase-client'

export interface AnalyticsEvent {
  id: string
  user_id?: string
  event_type: string
  event_data: any
  page_url?: string
  user_agent?: string
  ip_address?: string
  created_at: string
}

export interface SalesAnalytics {
  total_sales: number
  total_revenue: number
  total_orders: number
  average_order_value: number
  top_products: Array<{
    product_id: string
    title: string
    sales_count: number
    revenue: number
  }>
  sales_by_period: Array<{
    period: string
    sales: number
    revenue: number
  }>
}

export interface UserAnalytics {
  total_users: number
  active_users: number
  new_users: number
  user_growth: number
  top_sellers: Array<{
    seller_id: string
    name: string
    sales: number
    revenue: number
  }>
}

export class AnalyticsService {
  private supabase = createClient()

  async trackEvent(eventData: {
    user_id?: string
    event_type: string
    event_data: any
    page_url?: string
    user_agent?: string
    ip_address?: string
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analytics')
        .insert({
          user_id: eventData.user_id,
          event_type: eventData.event_type,
          event_data: eventData.event_data,
          page_url: eventData.page_url,
          user_agent: eventData.user_agent,
          ip_address: eventData.ip_address,
        })

      if (error) {
        console.error('Track event error:', error)
      }
    } catch (error) {
      console.error('Analytics service error:', error)
    }
  }

  async getSalesAnalytics(sellerId?: string, period: string = '30d'): Promise<SalesAnalytics> {
    try {
      let query = this.supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            title,
            price
          ),
          orders:order_id (
            status,
            created_at
          )
        `)

      if (sellerId) {
        query = query.eq('seller_id', sellerId)
      }

      const { data: orderItems, error } = await query

      if (error) {
        console.error('Get sales analytics error:', error)
        return {
          total_sales: 0,
          total_revenue: 0,
          total_orders: 0,
          average_order_value: 0,
          top_products: [],
          sales_by_period: [],
        }
      }

      // Filter by period
      const cutoffDate = new Date()
      if (period === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7)
      } else if (period === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30)
      } else if (period === '90d') {
        cutoffDate.setDate(cutoffDate.getDate() - 90)
      }

      const filteredItems = orderItems?.filter(item => 
        new Date(item.orders.created_at) >= cutoffDate && 
        item.orders.status === 'paid'
      ) || []

      // Calculate analytics
      const totalSales = filteredItems.length
      const totalRevenue = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const uniqueOrders = new Set(filteredItems.map(item => item.order_id)).size
      const averageOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0

      // Top products
      const productSales: { [key: string]: { count: number; revenue: number; title: string } } = {}
      filteredItems.forEach(item => {
        const productId = item.product_id
        if (!productSales[productId]) {
          productSales[productId] = {
            count: 0,
            revenue: 0,
            title: item.products.title,
          }
        }
        productSales[productId].count += item.quantity
        productSales[productId].revenue += item.price * item.quantity
      })

      const topProducts = Object.entries(productSales)
        .map(([productId, data]) => ({
          product_id: productId,
          title: data.title,
          sales_count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Sales by period (daily for now)
      const salesByPeriod: { [key: string]: { sales: number; revenue: number } } = {}
      filteredItems.forEach(item => {
        const date = new Date(item.orders.created_at).toISOString().split('T')[0]
        if (!salesByPeriod[date]) {
          salesByPeriod[date] = { sales: 0, revenue: 0 }
        }
        salesByPeriod[date].sales += item.quantity
        salesByPeriod[date].revenue += item.price * item.quantity
      })

      const salesByPeriodArray = Object.entries(salesByPeriod)
        .map(([period, data]) => ({
          period,
          sales: data.sales,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.period.localeCompare(b.period))

      return {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_orders: uniqueOrders,
        average_order_value: averageOrderValue,
        top_products: topProducts,
        sales_by_period: salesByPeriodArray,
      }
    } catch (error) {
      console.error('Get sales analytics error:', error)
      return {
        total_sales: 0,
        total_revenue: 0,
        total_orders: 0,
        average_order_value: 0,
        top_products: [],
        sales_by_period: [],
      }
    }
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    try {
      // Get total users
      const { count: totalUsers, error: usersError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) {
        console.error('Get total users error:', usersError)
        return {
          total_users: 0,
          active_users: 0,
          new_users: 0,
          user_growth: 0,
          top_sellers: [],
        }
      }

      // Get active users (users with orders in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: activeUsers, error: activeError } = await this.supabase
        .from('orders')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('user_id', 'is', null)

      const uniqueActiveUsers = new Set(activeUsers?.map(order => order.user_id)).size

      // Get new users (registered in last 30 days)
      const { count: newUsers, error: newUsersError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Get top sellers
      const { data: topSellers, error: sellersError } = await this.supabase
        .from('profiles')
        .select(`
          id,
          name,
          business_name,
          total_earnings,
          total_sales
        `)
        .eq('role', 'seller')
        .order('total_earnings', { ascending: false })
        .limit(10)

      const topSellersArray = topSellers?.map(seller => ({
        seller_id: seller.id,
        name: seller.business_name || seller.name,
        sales: seller.total_sales || 0,
        revenue: seller.total_earnings || 0,
      })) || []

      return {
        total_users: totalUsers || 0,
        active_users: uniqueActiveUsers,
        new_users: newUsers || 0,
        user_growth: totalUsers ? ((newUsers || 0) / totalUsers) * 100 : 0,
        top_sellers: topSellersArray,
      }
    } catch (error) {
      console.error('Get user analytics error:', error)
      return {
        total_users: 0,
        active_users: 0,
        new_users: 0,
        user_growth: 0,
        top_sellers: [],
      }
    }
  }

  async trackPageView(userId: string, pageUrl: string, userAgent?: string): Promise<void> {
    await this.trackEvent({
      user_id: userId,
      event_type: 'page_view',
      event_data: { page_url: pageUrl },
      page_url: pageUrl,
      user_agent: userAgent,
    })
  }

  async trackProductView(userId: string, productId: string, productTitle: string): Promise<void> {
    await this.trackEvent({
      user_id: userId,
      event_type: 'product_view',
      event_data: { product_id: productId, product_title: productTitle },
    })
  }

  async trackPurchase(userId: string, orderId: string, amount: number): Promise<void> {
    await this.trackEvent({
      user_id: userId,
      event_type: 'purchase',
      event_data: { order_id: orderId, amount },
    })
  }

  async trackDownload(userId: string, productId: string, productTitle: string): Promise<void> {
    await this.trackEvent({
      user_id: userId,
      event_type: 'download',
      event_data: { product_id: productId, product_title: productTitle },
    })
  }
}

export const analyticsService = new AnalyticsService() 