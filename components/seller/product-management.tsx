"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Package, Plus, Edit, Eye, Trash2, MoreHorizontal, Star, TrendingUp, Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase-client'

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  status: string
  image_url?: string
  created_at: string
  updated_at: string
  total_sales: number
  total_revenue: number
  rating: number
  total_reviews: number
}

export function ProductManagement() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
      if (error) {
        toast({ title: "Gagal memuat produk", description: error.message, variant: "destructive" })
        setProducts([])
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }

    fetchProducts()

    // Auto-refresh products every 30 seconds
    const interval = setInterval(() => {
      fetchProducts()
    }, 30000)

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts()
      }
    }

    const handleFocus = () => {
      fetchProducts()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const filteredProducts = useMemo(() => {
    return (products || []).filter((product) => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || product.status === statusFilter
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [products, searchQuery, statusFilter, categoryFilter])

  const handleDeleteProduct = async (productId: string) => {
    if (!user?.id) return

    // Add confirmation dialog
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.")) {
      return
    }

    try {
      // Check if product has any orders first
      const { data: orderItems, error: orderCheckError } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", productId)
        .limit(1)

      if (orderCheckError) {
        toast({
          title: "Gagal memeriksa produk",
          description: "Tidak dapat memeriksa apakah produk memiliki pesanan.",
          variant: "destructive"
        })
        return
      }

      if (orderItems && orderItems.length > 0) {
        toast({
          title: "Tidak dapat menghapus produk",
          description: "Produk ini memiliki pesanan dan tidak dapat dihapus. Gunakan fitur Nonaktifkan sebagai gantinya.",
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("seller_id", user.id)

      if (error) {
        toast({
          title: "Gagal menghapus produk",
          description: `Error: ${error.message}. Kode: ${error.code || 'N/A'}`,
          variant: "destructive"
        })
      } else {
        setProducts((prev) => (prev || []).filter((p) => p.id !== productId))
        toast({
          title: "Produk dihapus",
          description: "Produk berhasil dihapus dari toko Anda."
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Gagal menghapus produk",
        description: `Terjadi kesalahan: ${errorMessage}`,
        variant: "destructive"
      })
    }
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground mb-8">Silakan login untuk mengakses halaman ini</p>
        <Button asChild>
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    if (!user?.id) return

    const newStatus = currentStatus === "active" ? "inactive" : "active"

    try {
      const { error } = await supabase
        .from("products")
        .update({ status: newStatus })
        .eq("id", productId)
        .eq("seller_id", user.id)

      if (error) {
        toast({
          title: "Gagal mengubah status produk",
          description: error.message || "Terjadi kesalahan saat mengubah status produk",
          variant: "destructive"
        })
      } else {
        // Update the local state
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? { ...product, status: newStatus }
              : product
          )
        )

        toast({
          title: "Status produk diubah",
          description: `Produk berhasil diubah menjadi ${newStatus === "active" ? "aktif" : "tidak aktif"}.`,
        })
      }
    } catch {
      toast({
        title: "Gagal mengubah status produk",
        description: "Terjadi kesalahan saat mengubah status produk.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kelola Produk</h1>
          <p className="text-muted-foreground">Kelola semua produk digital Anda</p>
        </div>
        <Button asChild>
          <Link href="/seller/create-product">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(products || []).filter((p) => p.status === "active").length} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(products || []).reduce((sum, p) => sum + p.total_sales, 0)}</div>
            <p className="text-xs text-muted-foreground">produk terjual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((products || []).reduce((sum, p) => sum + p.total_revenue, 0))}
            </div>
            <p className="text-xs text-muted-foreground">dari semua produk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products || []).length > 0 ? ((products || []).reduce((sum, p) => sum + p.rating, 0) / (products || []).length).toFixed(1) : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">
              dari {(products || []).reduce((sum, p) => sum + p.total_reviews, 0)} ulasan
            </p>
          </CardContent>
        </Card>


      </div>

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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="E-book">E-book</SelectItem>
                <SelectItem value="Template">Template</SelectItem>
                <SelectItem value="Kursus Online">Kursus Online</SelectItem>
                <SelectItem value="Software & Tools">Software & Tools</SelectItem>
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
                <SelectItem value="revenue">Pendapatan Tertinggi</SelectItem>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Penjualan</TableHead>
                <TableHead>Pendapatan</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredProducts || []).map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-md border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Dibuat: {new Date(product.created_at).toLocaleDateString("id-ID")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">Harga:</span>{" "}
                      <span className="text-primary">{formatCurrency(product.price)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.total_sales}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {product.total_sales} terjual
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">{formatCurrency(product.total_revenue)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{product.rating}</span>
                      <span className="text-sm text-muted-foreground">({product.total_reviews})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge
                        className={
                          product.status === "active"
                            ? "bg-green-100 text-green-800"
                            : product.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {product.status === "active" ? "Aktif" : product.status === "draft" ? "Draft" : "Tidak Aktif"}
                      </Badge>
                      {product.status === "draft" && (
                        <p className="text-xs text-muted-foreground mt-1">Edit lalu aktifkan untuk memublikasikan</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem onClick={() => handleToggleStatus(product.id, product.status)}>
                          {product.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!filteredProducts || filteredProducts.length === 0) && (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
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
        </CardContent>
      </Card>
    </div>
  )
}
