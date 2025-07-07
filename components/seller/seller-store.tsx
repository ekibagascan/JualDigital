"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, Plus, Edit, Eye, MoreHorizontal, Star, Users, TrendingUp, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"

// Mock data
const mockProducts = [
  {
    id: "1",
    title: "E-book Panduan Digital Marketing",
    price: 99000,
    variants: [
      { name: "Basic", price: 99000 },
      { name: "Premium", price: 149000 },
    ],
    sales: 234,
    rating: 4.8,
    reviews: 45,
    status: "active",
    image: "/placeholder.svg?height=200&width=300&text=E-book+Cover",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Template Website Modern",
    price: 199000,
    variants: [
      { name: "Single License", price: 199000 },
      { name: "Commercial License", price: 399000 },
    ],
    sales: 156,
    rating: 4.9,
    reviews: 32,
    status: "active",
    image: "/placeholder.svg?height=200&width=300&text=Website+Template",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    title: "Kursus React & Next.js",
    price: 299000,
    variants: [
      { name: "Basic Access", price: 299000 },
      { name: "Premium + Certificate", price: 499000 },
    ],
    sales: 89,
    rating: 4.7,
    reviews: 28,
    status: "draft",
    image: "/placeholder.svg?height=200&width=300&text=React+Course",
    createdAt: "2024-01-05",
  },
]

const mockStats = {
  totalProducts: 15,
  totalSales: 479,
  totalEarnings: 23450000,
  averageRating: 4.8,
  totalReviews: 105,
  followers: 1234,
}

export function SellerStore() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground mb-8">Silakan login untuk mengakses toko Anda</p>
        <Button asChild>
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  const isSeller = user.role === "author" || user.role === "admin"

  if (!isSeller) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Akses Terbatas</h2>
        <p className="text-muted-foreground mb-8">Anda perlu menjadi penjual untuk mengakses halaman ini</p>
        <Button asChild>
          <Link href="/mulai-jualan">Daftar Sebagai Penjual</Link>
        </Button>
      </div>
    )
  }

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "sales":
        return b.sales - a.sales
      case "rating":
        return b.rating - a.rating
      case "price-high":
        return b.price - a.price
      case "price-low":
        return a.price - b.price
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-16 h-16" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
              <p className="text-xl opacity-90 mb-4">Penjual Digital Terpercaya</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>{mockStats.totalProducts} Produk</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>{mockStats.totalSales} Penjualan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>
                    {mockStats.averageRating} ({mockStats.totalReviews} ulasan)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{mockStats.followers} Pengikut</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button asChild variant="secondary">
                <Link href="/seller/create-product">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Produk
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20">
                <Link href="/profile">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profil
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Store Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="products" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Produk ({mockStats.totalProducts})</TabsTrigger>
            <TabsTrigger value="reviews">Ulasan ({mockStats.totalReviews})</TabsTrigger>
            <TabsTrigger value="about">Tentang</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Cari produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="inactive">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Terbaru</SelectItem>
                      <SelectItem value="oldest">Terlama</SelectItem>
                      <SelectItem value="sales">Penjualan Tertinggi</SelectItem>
                      <SelectItem value="rating">Rating Tertinggi</SelectItem>
                      <SelectItem value="price-high">Harga Tertinggi</SelectItem>
                      <SelectItem value="price-low">Harga Terendah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      className={`absolute top-2 right-2 ${
                        product.status === "active"
                          ? "bg-green-500"
                          : product.status === "draft"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    >
                      {product.status === "active" ? "Aktif" : product.status === "draft" ? "Draft" : "Tidak Aktif"}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>

                    {/* Variants */}
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">{product.variants.length} varian tersedia</p>
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map((variant, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variant.name}: {formatCurrency(variant.price)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{product.sales} terjual</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(Math.min(...product.variants.map((v) => v.price)))}
                          {product.variants.length > 1 && (
                            <span className="text-sm text-muted-foreground">
                              {" "}
                              - {formatCurrency(Math.max(...product.variants.map((v) => v.price)))}
                            </span>
                          )}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/product/${product.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Lihat Produk
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/seller/edit-product/${product.id}`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Produk
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {sortedProducts.length === 0 && (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "Coba ubah filter pencarian Anda"
                    : "Mulai dengan menambahkan produk pertama Anda"}
                </p>
                <Button asChild>
                  <Link href="/seller/create-product">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Produk
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ulasan Pelanggan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Ahmad Rizki</span>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">2 hari yang lalu</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">E-book Panduan Digital Marketing</p>
                          <p className="text-sm">
                            Produk sangat berkualitas dan mudah dipahami. Sangat membantu untuk memulai bisnis digital
                            marketing.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tentang Penjual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Saya adalah seorang digital marketer dan content creator yang berpengalaman lebih dari 5 tahun di
                    industri digital. Saya berkomitmen untuk menyediakan produk digital berkualitas tinggi yang dapat
                    membantu Anda mengembangkan bisnis dan keterampilan digital.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{mockStats.totalProducts}</div>
                      <div className="text-sm text-muted-foreground">Total Produk</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{mockStats.totalSales}</div>
                      <div className="text-sm text-muted-foreground">Total Penjualan</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{mockStats.averageRating}</div>
                      <div className="text-sm text-muted-foreground">Rating Rata-rata</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{mockStats.followers}</div>
                      <div className="text-sm text-muted-foreground">Pengikut</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
