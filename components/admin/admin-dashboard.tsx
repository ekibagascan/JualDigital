"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Package, DollarSign, ShoppingCart, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface DashboardStats {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative"
}

interface RecentOrder {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  user_id: string
  profiles: { email: string } | null
}

interface TopProduct {
  name: string
  image: string
  sales: number
  revenue: number
  id: string
}

interface DashboardData {
  stats: DashboardStats[]
  recentOrders: RecentOrder[]
  topProducts: TopProduct[]
}

// Fallback data in case API fails
const fallbackStats: DashboardStats[] = [
  {
    title: "Total Pengguna",
    value: "0",
    change: "0%",
    changeType: "positive",
  },
  {
    title: "Total Produk",
    value: "0",
    change: "0%",
    changeType: "positive",
  },
  {
    title: "Total Pendapatan",
    value: "Rp 0",
    change: "0%",
    changeType: "positive",
  },
  {
    title: "Total Pesanan",
    value: "0",
    change: "0%",
    changeType: "positive",
  },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats[]>(fallbackStats)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchDashboardData()
    }
  }, [mounted])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Add cache-busting headers to prevent stale data
      const response = await fetch('/api/admin/dashboard/', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data: DashboardData = await response.json()

      setStats(data.stats)
      setRecentOrders(data.recentOrders)
      setTopProducts(data.topProducts)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError('Gagal memuat data dashboard')
      // Keep fallback stats
    } finally {
      setLoading(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Ringkasan data marketplace digital
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                {index === 0 && <Users className="h-4 w-4" />}
                {index === 1 && <Package className="h-4 w-4" />}
                {index === 2 && <DollarSign className="h-4 w-4" />}
                {index === 3 && <ShoppingCart className="h-4 w-4" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.changeType === "positive"
                ? "text-green-600"
                : "text-red-600"
                }`}>
                {stat.change} dari bulan lalu
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pesanan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center space-x-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {order.order_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.profiles?.email || 'Email tidak tersedia'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Rp {order.total_amount?.toLocaleString() || '0'}
                      </p>
                      <p className={`text-xs ${order.status === 'paid' ? 'text-green-600' :
                        order.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {order.status === 'paid' ? 'Lunas' :
                          order.status === 'pending' ? 'Menunggu' : 'Gagal'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada pesanan</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                    onClick={() => router.push(`/product/${product.id}`)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.sales} terjual
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">
                        Rp {product.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data produk</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
