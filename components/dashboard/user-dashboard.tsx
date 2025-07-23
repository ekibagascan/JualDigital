"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart,
  Download,
  Heart,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Settings
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface DashboardStats {
  totalPurchases: number
  totalSpent: number
  wishlistItems: number
  downloadedItems: number
}

interface SellerStats {
  totalProducts: number
  totalSales: number
  totalEarnings: number
  pendingWithdrawal: number
}

interface RecentPurchase {
  id: string
  title: string
  author: string
  price: number
  date: string
  status: string
}

interface RecentProduct {
  id: string
  title: string
  price: number
  sales: number
  earnings: number
  status: string
}

export function UserDashboard() {
  const { user, loading } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [userStats, setUserStats] = useState<DashboardStats>({
    totalPurchases: 0,
    totalSpent: 0,
    wishlistItems: 0,
    downloadedItems: 0,
  })
  const [sellerStats, setSellerStats] = useState<SellerStats>({
    totalProducts: 0,
    totalSales: 0,
    totalEarnings: 0,
    pendingWithdrawal: 0,
  })
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([])
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])

  const fetchDashboardData = async () => {
    if (user?.id) {
      try {
        setDashboardLoading(true)
        const response = await fetch(`/api/dashboard/stats`)
        const data = await response.json()

        if (data.success) {
          setUserStats(data.userStats)
          setSellerStats(data.sellerStats)
          setRecentPurchases(data.recentPurchases)
          setRecentProducts(data.recentProducts)
        } else {
          console.error('Failed to fetch dashboard data:', data.error)
          toast({
            title: "Error",
            description: "Gagal memuat data dashboard.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast({
          title: "Error",
          description: "Gagal memuat data dashboard.",
          variant: "destructive",
        })
      } finally {
        setDashboardLoading(false)
      }
    } else {
      setDashboardLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchDashboardData();
    }
  }, [user, loading]);

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground mb-8">Silakan login untuk mengakses dashboard</p>
        <Button asChild>
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  const isSeller = user.role === "author" || user.role === "admin"

  if (dashboardLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
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
          <h1 className="text-3xl font-bold">Halo, {user.user_metadata?.name || user.email || "Pengguna"}</h1>
          <p className="text-muted-foreground">Selamat datang kembali, {user.user_metadata?.name || user.email || "Pengguna"}!</p>
        </div>
        <Button asChild>
          <Link href="/profile">
            <Settings className="w-4 h-4 mr-2" />
            Pengaturan
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchases">Pembelian</TabsTrigger>
          {isSeller && <TabsTrigger value="seller">Penjualan</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalPurchases}</div>
                <p className="text-xs text-muted-foreground">produk digital</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(userStats.totalSpent)}</div>
                <p className="text-xs text-muted-foreground">sepanjang masa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.wishlistItems}</div>
                <p className="text-xs text-muted-foreground">produk disimpan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Download</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.downloadedItems}</div>
                <p className="text-xs text-muted-foreground">produk diunduh</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button asChild className="h-auto p-4 flex-col">
                  <Link href="/categories">
                    <ShoppingCart className="w-6 h-6 mb-2" />
                    Jelajahi Produk
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                  <Link href="/purchases">
                    <Package className="w-6 h-6 mb-2" />
                    Pembelian Saya
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                  <Link href="/profile">
                    <Users className="w-6 h-6 mb-2" />
                    Edit Profil
                  </Link>
                </Button>
                {!isSeller && (
                  <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                    <Link href="/mulai-jualan">
                      <Package className="w-6 h-6 mb-2" />
                      Jadi Penjual
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pembelian Terbaru</CardTitle>
              <Button asChild variant="outline">
                <Link href="/purchases">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentPurchases.length > 0 ? (
                <div className="space-y-4">
                  {recentPurchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{purchase.title}</h4>
                        <p className="text-sm text-muted-foreground">oleh {purchase.author}</p>
                        <p className="text-xs text-muted-foreground">{purchase.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(purchase.price)}</p>
                        <p className="text-xs text-green-600">Selesai</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada pembelian</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seller Tab */}
        {isSeller && (
          <TabsContent value="seller" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sellerStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">produk aktif</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sellerStats.totalSales}</div>
                  <p className="text-xs text-muted-foreground">produk terjual</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Penghasilan</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(sellerStats.totalEarnings)}</div>
                  <p className="text-xs text-muted-foreground">sepanjang masa</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Tertunda</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(sellerStats.pendingWithdrawal)}</div>
                  <p className="text-xs text-muted-foreground">siap dicairkan</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produk Terbaru</CardTitle>
                  <Button asChild>
                    <Link href="/seller/create-product">
                      <Package className="w-4 h-4 mr-2" />
                      Tambah Produk
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentProducts.length > 0 ? (
                    <div className="space-y-4">
                      {recentProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{product.title}</h4>
                            <p className="text-sm text-muted-foreground">{product.sales} terjual</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(product.earnings)}</p>
                            <p className="text-xs text-green-600">Aktif</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Belum ada produk</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aksi Penjual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button asChild className="w-full justify-start">
                      <Link href="/seller/create-product">
                        <Package className="w-4 h-4 mr-2" />
                        Tambah Produk Baru
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href="/seller/products">
                        <Package className="w-4 h-4 mr-2" />
                        Kelola Produk
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href="/seller/analytics">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analytics
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                      <Link href="/seller/withdrawals">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Penarikan Dana
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
