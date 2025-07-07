"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, DollarSign, Package, Eye, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"

// Mock data
const mockAnalytics = {
  overview: {
    totalRevenue: 12450000,
    revenueChange: 23.5,
    totalSales: 479,
    salesChange: 18.2,
    totalViews: 15420,
    viewsChange: -5.3,
    conversionRate: 3.1,
    conversionChange: 12.8,
  },
  monthlyData: [
    { month: "Jan", revenue: 2100000, sales: 67, views: 2150 },
    { month: "Feb", revenue: 1850000, sales: 52, views: 1980 },
    { month: "Mar", revenue: 2450000, sales: 78, views: 2340 },
    { month: "Apr", revenue: 2200000, sales: 71, views: 2180 },
    { month: "May", revenue: 1950000, sales: 58, views: 2050 },
    { month: "Jun", revenue: 1900000, sales: 153, views: 2710 },
  ],
  topProducts: [
    {
      id: "1",
      title: "E-book Panduan Digital Marketing",
      sales: 234,
      revenue: 23166000,
      views: 5420,
      conversionRate: 4.3,
      rating: 4.8,
    },
    {
      id: "2",
      title: "Template Website Modern",
      sales: 156,
      revenue: 31044000,
      views: 3890,
      conversionRate: 4.0,
      rating: 4.9,
    },
    {
      id: "3",
      title: "Kursus React & Next.js",
      sales: 89,
      revenue: 26611000,
      views: 2340,
      conversionRate: 3.8,
      rating: 4.7,
    },
  ],
  recentActivity: [
    { type: "sale", message: "Penjualan baru: E-book Digital Marketing", time: "5 menit yang lalu" },
    { type: "review", message: "Review 5 bintang untuk Template Website", time: "1 jam yang lalu" },
    { type: "sale", message: "Penjualan baru: Kursus React & Next.js", time: "2 jam yang lalu" },
    { type: "view", message: "100+ views untuk produk terbaru", time: "3 jam yang lalu" },
  ],
}

export function SellerAnalytics() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState("30d")

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground">Silakan login untuk melihat analytics</p>
      </div>
    )
  }

  const { overview, topProducts, recentActivity } = mockAnalytics

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
                {Math.abs(overview.revenueChange)}%
              </span>
              <span className="text-muted-foreground ml-1">dari bulan lalu</span>
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
                {Math.abs(overview.salesChange)}%
              </span>
              <span className="text-muted-foreground ml-1">dari bulan lalu</span>
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
                {Math.abs(overview.viewsChange)}%
              </span>
              <span className="text-muted-foreground ml-1">dari bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.conversionRate}%</div>
            <div className="flex items-center text-xs">
              {overview.conversionChange > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={overview.conversionChange > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(overview.conversionChange)}%
              </span>
              <span className="text-muted-foreground ml-1">dari bulan lalu</span>
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
              {topProducts.map((product, index) => (
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
                          {product.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-muted-foreground">{product.conversionRate}% conversion</div>
                  </div>
                </div>
              ))}
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
                    className={`p-2 rounded-full ${
                      activity.type === "sale"
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
