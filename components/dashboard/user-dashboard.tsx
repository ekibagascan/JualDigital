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
  Package,
  DollarSign,
  Users,
  Settings,
  RefreshCw,
  Store,
  Clock
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

interface DashboardStats {
  totalPurchases: number
  totalSpent: number
  wishlistItems: number
  downloadedItems: number
}

interface RecentPurchase {
  id: string
  title: string
  author: string
  price: number
  date: string
  status: string
  image_url?: string
}

export function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [userProfile, setUserProfile] = useState<{ role?: string } | null>(null)
  const [userStats, setUserStats] = useState<DashboardStats>({
    totalPurchases: 0,
    totalSpent: 0,
    wishlistItems: 0,
    downloadedItems: 0,
  })
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([])

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserProfile();
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchUserProfile = async () => {
    if (user?.id) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
        } else if (profile) {
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
  }

  const fetchDashboardData = async () => {
    if (!user) return

    setDashboardLoading(true)

    try {
      const response = await fetch(`/api/dashboard/stats?t=${Date.now()}&r=${Math.random()}`, {
        headers: {
          'x-user-id': user.id,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setUserStats(data.userStats)
        setRecentPurchases(data.recentPurchases || [])
      } else {
        console.error('Failed to fetch dashboard data:', data.error)
        toast({
          title: "Error",
          description: "Gagal memuat data dashboard.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

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

  const isSeller = userProfile?.role === "seller"
  const isPendingSeller = userProfile?.role === "pending"

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

            <Link href="/wishlist" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.wishlistItems}</div>
                  <p className="text-xs text-muted-foreground">produk disimpan</p>
                </CardContent>
              </Card>
            </Link>

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
                  <Link href="/produk">
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
                {!isSeller && !isPendingSeller && (
                  <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                    <Link href="/mulai-jualan">
                      <Package className="w-6 h-6 mb-2" />
                      Jadi Penjual
                    </Link>
                  </Button>
                )}
                {isSeller && (
                  <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                    <Link href="/seller">
                      <Store className="w-6 h-6 mb-2" />
                      Toko Saya
                    </Link>
                  </Button>
                )}
                {isPendingSeller && (
                  <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent" disabled>
                    <Link href="/seller">
                      <Clock className="w-6 h-6 mb-2" />
                      Toko Pending
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
                    <div key={purchase.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={purchase.image_url || "/placeholder.svg"}
                          alt={purchase.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{purchase.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">oleh {purchase.author}</p>
                        <p className="font-semibold text-primary">{formatCurrency(purchase.price)}</p>
                        <p className="text-xs text-muted-foreground">{purchase.date}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Kirim Ulang
                        </Button>
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

      </Tabs>
    </div>
  )
}
