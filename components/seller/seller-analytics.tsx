"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, DollarSign, Package, Eye, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"

// Helper functions for time calculations
const getTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return "Baru saja"
  if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`
  if (diffInDays < 7) return `${diffInDays} hari yang lalu`
  return `${Math.floor(diffInDays / 7)} minggu yang lalu`
}

const getTimeInMinutes = (timeString: string): number => {
  if (timeString.includes("Baru saja")) return 0
  if (timeString.includes("menit")) {
    const minutes = parseInt(timeString.match(/(\d+)/)?.[1] || "0")
    return minutes
  }
  if (timeString.includes("jam")) {
    const hours = parseInt(timeString.match(/(\d+)/)?.[1] || "0")
    return hours * 60
  }
  if (timeString.includes("hari")) {
    const days = parseInt(timeString.match(/(\d+)/)?.[1] || "0")
    return days * 24 * 60
  }
  if (timeString.includes("minggu")) {
    const weeks = parseInt(timeString.match(/(\d+)/)?.[1] || "0")
    return weeks * 7 * 24 * 60
  }
  return 0
}

interface AnalyticsData {
  overview: {
    totalRevenue: number
    revenueChange: number
    totalSales: number
    salesChange: number
    totalViews: number
    viewsChange: number
    conversionRate: number
    conversionChange: number
  }
  topProducts: Array<{
    id: string
    title: string
    sales: number
    revenue: number
    views: number
    conversionRate: number
    rating: number
  }>
  recentActivity: Array<{
    type: "sale" | "review" | "view"
    message: string
    time: string
  }>
}

export function SellerAnalytics() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState("30d")
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: {
      totalRevenue: 0,
      revenueChange: 0,
      totalSales: 0,
      salesChange: 0,
      totalViews: 0,
      viewsChange: 0,
      conversionRate: 0,
      conversionChange: 0,
    },
    topProducts: [],
    recentActivity: [],
  })

  useEffect(() => {
    if (!user) return
    fetchAnalytics()
  }, [user, timeRange])

  const fetchAnalytics = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Calculate date range based on timeRange
      const now = new Date()
      const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      // Fetch current period data (paid orders only)
      const { data: currentOrders, error: currentError } = await supabase
        .from('order_items')
        .select(`
          id,
          price,
          quantity,
          seller_earnings,
          created_at,
          orders!inner (
            id,
            status
          ),
          products!inner (
            id,
            title,
            seller_id,
            total_sales,
            rating,
            total_reviews
          )
        `)
        .eq('products.seller_id', user.id)
        .eq('orders.status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())

      if (currentError) {
        console.error('[SELLER ANALYTICS] Error fetching current orders:', currentError)
        toast({
          title: "Error",
          description: "Gagal memuat data analytics",
          variant: "destructive",
        })
        return
      }



      // Fetch previous period data for comparison (paid orders only)
      const { data: previousOrders, error: previousError } = await supabase
        .from('order_items')
        .select(`
          id,
          price,
          quantity,
          seller_earnings,
          created_at,
          orders!inner (
            id,
            status
          ),
          products!inner (
            id,
            title,
            seller_id,
            total_sales,
            rating,
            total_reviews
          )
        `)
        .eq('products.seller_id', user.id)
        .eq('orders.status', 'paid')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())

      if (previousError) {
        console.error('[SELLER ANALYTICS] Error fetching previous orders:', previousError)
      }



      // Calculate current period metrics using seller_earnings
      const currentRevenue = (currentOrders || []).reduce((sum, item) => sum + (item.seller_earnings || 0), 0)
      const currentSales = (currentOrders || []).reduce((sum, item) => sum + item.quantity, 0)
      // For views, we'll use a placeholder since we don't have real view tracking
      const currentViews = Math.round(currentSales * 3) // Estimate: 3 views per sale

      // Calculate previous period metrics
      const previousRevenue = (previousOrders || []).reduce((sum, item) => sum + (item.seller_earnings || 0), 0)
      const previousSales = (previousOrders || []).reduce((sum, item) => sum + item.quantity, 0)
      const previousViews = Math.round(previousSales * 3) // Estimate: 3 views per sale



      // Calculate changes
      const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
      const salesChange = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0
      const viewsChange = previousViews > 0 ? ((currentViews - previousViews) / previousViews) * 100 : 0

      // Calculate conversion rate
      const conversionRate = currentViews > 0 ? (currentSales / currentViews) * 100 : 0
      const previousConversionRate = previousViews > 0 ? (previousSales / previousViews) * 100 : 0
      const conversionChange = previousConversionRate > 0 ? ((conversionRate - previousConversionRate) / previousConversionRate) * 100 : 0

      // Fetch top products with actual sales data
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .order('total_sales', { ascending: false })
        .limit(3)

      if (topProductsError) {
        console.error('[SELLER ANALYTICS] Error fetching top products:', topProductsError)
      }

      // Process top products with real data
      const topProducts = (topProductsData || []).map(product => ({
        id: product.id,
        title: product.title,
        sales: product.total_sales || 0,
        revenue: 0, // We'll calculate this from order_items
        views: Math.round((product.total_sales || 0) * 3), // Estimate views
        conversionRate: 33.3, // Estimate: 33.3% conversion rate
        rating: product.rating || 0,
      }))

      // Calculate actual revenue for top products
      for (const product of topProducts) {
        const productOrders = (currentOrders || []).filter(item =>
          (item.products as any)?.id === product.id
        )
        product.revenue = productOrders.reduce((sum, item) => sum + (item.seller_earnings || 0), 0)
      }

      // Fetch recent orders for activity feed (paid orders only)
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('order_items')
        .select(`
           id,
           product_title,
           created_at,
           orders!inner (
             id,
             status
           ),
           products!inner (
             id,
             title,
             seller_id
           )
         `)
        .eq('products.seller_id', user.id)
        .eq('orders.status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentOrdersError) {
        console.error('[SELLER ANALYTICS] Error fetching recent orders:', recentOrdersError)
      }

      // Fetch recent reviews for activity feed
      const { data: recentReviews, error: recentReviewsError } = await supabase
        .from('reviews')
        .select(`
           id,
           rating,
           content,
           created_at,
           products!inner (
             id,
             title,
             seller_id
           )
         `)
        .eq('products.seller_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentReviewsError) {
        console.error('[SELLER ANALYTICS] Error fetching recent reviews:', recentReviewsError)
      }

      // Generate real activity feed
      const recentActivity: Array<{
        type: "sale" | "review" | "view"
        message: string
        time: string
      }> = []

        // Add recent sales
        ; (recentOrders || []).slice(0, 3).forEach(order => {
          const timeAgo = getTimeAgo(new Date(order.created_at))
          recentActivity.push({
            type: "sale" as const,
            message: `Penjualan baru: ${order.product_title}`,
            time: timeAgo
          })
        })

        // Add recent reviews
        ; (recentReviews || []).slice(0, 2).forEach(review => {
          const timeAgo = getTimeAgo(new Date(review.created_at))
          recentActivity.push({
            type: "review" as const,
            message: `Review ${review.rating} bintang untuk ${(review.products as any)?.title || 'Produk'}`,
            time: timeAgo
          })
        })

      // Sort by time (most recent first)
      recentActivity.sort((a, b) => {
        const timeA = getTimeInMinutes(a.time)
        const timeB = getTimeInMinutes(b.time)
        return timeA - timeB
      })

      // Limit to 4 most recent activities
      const finalRecentActivity = recentActivity.slice(0, 4)

      const finalData = {
        overview: {
          totalRevenue: currentRevenue,
          revenueChange,
          totalSales: currentSales,
          salesChange,
          totalViews: currentViews,
          viewsChange,
          conversionRate,
          conversionChange,
        },
        topProducts,
        recentActivity: finalRecentActivity,
      }



      setAnalyticsData(finalData)

    } catch (error) {
      console.error('[SELLER ANALYTICS] Error fetching analytics:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground">Silakan login untuk melihat analytics</p>
      </div>
    )
  }

  const { overview, topProducts, recentActivity } = analyticsData

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Pantau performa penjualan dan produk Anda</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Hari Terakhir</SelectItem>
              <SelectItem value="30d">30 Hari Terakhir</SelectItem>
              <SelectItem value="90d">90 Hari Terakhir</SelectItem>
              <SelectItem value="1y">1 Tahun Terakhir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Pantau performa penjualan dan produk Anda</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
            <SelectItem value="90d">90 Hari Terakhir</SelectItem>
            <SelectItem value="1y">1 Tahun Terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</div>
            <div className="flex items-center text-xs">
              {overview.revenueChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={overview.revenueChange > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(overview.revenueChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalSales}</div>
            <div className="flex items-center text-xs">
              {overview.salesChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={overview.salesChange > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(overview.salesChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalViews.toLocaleString("id-ID")}</div>
            <div className="flex items-center text-xs">
              {overview.viewsChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={overview.viewsChange > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(overview.viewsChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.conversionRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs">
              {overview.conversionChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={overview.conversionChange > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(overview.conversionChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium line-clamp-1">{product.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {product.sales} terjual
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {product.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {product.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{formatCurrency(product.revenue)}</div>
                      <div className="text-sm text-muted-foreground">{product.conversionRate.toFixed(1)}% conversion</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada produk terjual</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-full ${activity.type === "sale"
                      ? "bg-green-100 text-green-600"
                      : activity.type === "review"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {activity.type === "sale" ? (
                      <DollarSign className="w-4 h-4" />
                    ) : activity.type === "review" ? (
                      <Star className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik Performa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Grafik performa akan ditampilkan di sini</p>
              <p className="text-sm text-muted-foreground">Integrasi dengan chart library diperlukan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
