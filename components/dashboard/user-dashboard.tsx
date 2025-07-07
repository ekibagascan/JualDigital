"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag, Heart, User, CreditCard, Package, TrendingUp, Plus, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"

// Mock data
const mockStats = {
  totalPurchases: 5,
  totalSpent: 1245000,
  wishlistItems: 12,
  downloadedItems: 8,
}

const mockSellerStats = {
  totalProducts: 15,
  totalSales: 234,
  totalEarnings: 12450000,
  pendingWithdrawal: 2340000,
}

const recentPurchases = [
  {
    id: "1",
    title: "E-book Digital Marketing",
    author: "Ahmad Rizki",
    price: 99000,
    date: "2024-01-15",
    status: "completed",
  },
  {
    id: "2",
    title: "Template Website Modern",
    author: "Sarah Design",
    price: 199000,
    date: "2024-01-10",
    status: "completed",
  },
]

const recentProducts = [
  {
    id: "1",
    title: "E-book Panduan SEO",
    price: 129000,
    sales: 45,
    earnings: 5805000,
    status: "active",
  },
  {
    id: "2",
    title: "Template Landing Page",
    price: 179000,
    sales: 23,
    earnings: 4117000,
    status: "active",
  },
]

export function UserDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang kembali, {user.name}!</p>
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
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.totalPurchases}</div>
                <p className="text-xs text-muted-foreground">produk digital</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(mockStats.totalSpent)}</div>
                <p className="text-xs text-muted-foreground">sepanjang masa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.wishlistItems}</div>
                <p className="text-xs text-muted-foreground">produk disimpan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Download</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.downloadedItems}</div>
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
                    <ShoppingBag className="w-6 h-6 mb-2" />
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
                    <User className="w-6 h-6 mb-2" />
                    Edit Profil
                  </Link>
                </Button>
                {!isSeller && (
                  <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                    <Link href="/mulai-jualan">
                      <Plus className="w-6 h-6 mb-2" />
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
                  <div className="text-2xl font-bold">{mockSellerStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">produk aktif</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockSellerStats.totalSales}</div>
                  <p className="text-xs text-muted-foreground">produk terjual</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Penghasilan</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(mockSellerStats.totalEarnings)}</div>
                  <p className="text-xs text-muted-foreground">sepanjang masa</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Tertunda</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(mockSellerStats.pendingWithdrawal)}</div>
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
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Produk
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
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
                        <Plus className="w-4 h-4 mr-2" />
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
                        <CreditCard className="w-4 h-4 mr-2" />
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
