"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Package, DollarSign, Wallet, ShoppingCart, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
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
  userName?: string
  userEmail?: string
  profiles?: { email: string } | null
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

// Fallback data in case API fails (must match API: 5 stats)
const fallbackStats: DashboardStats[] = [
  { title: "Total Pengguna", value: "0", change: "0%", changeType: "positive" },
  { title: "Total Produk", value: "0", change: "0%", changeType: "positive" },
  { title: "Total Pendapatan Seller", value: "Rp 0", change: "0%", changeType: "positive" },
  { title: "Total Pendapatan Admin", value: "Rp 0", change: "0%", changeType: "positive" },
  { title: "Total Pesanan", value: "0", change: "0%", changeType: "positive" },
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

      // Add cache-busting timestamp and headers to prevent stale data
      const response = await fetch(`/api/admin/dashboard?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {index === 0 && <Users className="h-4 w-4" />}
                {index === 1 && <Package className="h-4 w-4" />}
                {index === 2 && <DollarSign className="h-4 w-4" />}
                {index === 3 && <Wallet className="h-4 w-4" />}
                {index === 4 && <ShoppingCart className="h-4 w-4" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <p className={`text-xs mt-1 flex items-center gap-1 ${stat.changeType === "positive"
                ? "text-green-600"
                : "text-red-600"
                }`}>
                {stat.changeType === "positive" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.change} dari bulan lalu
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pesanan Terbaru</CardTitle>
            <p className="text-xs text-muted-foreground">5 pesanan terakhir</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border/60">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-4 first:pt-0">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium leading-none truncate">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.userEmail || order.profiles?.email || 'Email tidak tersedia'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">
                        Rp {order.total_amount?.toLocaleString() || '0'}
                      </p>
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${order.status === 'paid' ? 'bg-green-500/10 text-green-700' :
                        order.status === 'pending' ? 'bg-amber-500/10 text-amber-700' : 'bg-red-500/10 text-red-700'
                        }`}>
                        {order.status === 'paid' ? 'Lunas' :
                          order.status === 'pending' ? 'Menunggu' : 'Gagal'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-6">Belum ada pesanan</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Produk Terlaris</CardTitle>
            <p className="text-xs text-muted-foreground">Berdasarkan penjualan</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border/60">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div
                    key={product.id || index}
                    className="flex items-center gap-4 py-4 first:pt-0 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors"
                    onClick={() => product.id && router.push(`/product/${product.id}`)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
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
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.sales} terjual
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">
                        Rp {product.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-6">Belum ada data produk</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
