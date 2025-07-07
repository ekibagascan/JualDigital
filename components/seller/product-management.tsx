"use client"

import { useEffect, useState } from "react"
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
import { createClient } from "@/lib/supabase-client"

export function ProductManagement() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const supabase = createClient()

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
      } else {
        setProducts(data)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [user])

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleDeleteProduct = async (productId) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("seller_id", user.id)
    if (error) {
      toast({ title: "Gagal menghapus produk", description: error.message, variant: "destructive" })
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      toast({ title: "Produk dihapus", description: "Produk berhasil dihapus dari toko Anda." })
    }
  }

  // Example create/edit handlers (to be used in forms)
  const handleCreateProduct = async (formData) => {
    const { error, data } = await supabase
      .from("products")
      .insert([{ ...formData, seller_id: user.id }])
    if (error) {
      toast({ title: "Gagal menambah produk", description: error.message, variant: "destructive" })
    } else {
      setProducts((prev) => [data[0], ...prev])
      toast({ title: "Produk ditambahkan", description: "Produk berhasil ditambahkan." })
    }
  }

  const handleEditProduct = async (productId, formData) => {
    const { error } = await supabase
      .from("products")
      .update(formData)
      .eq("id", productId)
      .eq("seller_id", user.id)
    if (error) {
      toast({ title: "Gagal mengedit produk", description: error.message, variant: "destructive" })
    } else {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...formData } : p)))
      toast({ title: "Produk diperbarui", description: "Produk berhasil diperbarui." })
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

  if (loading) return <div>Loading...</div>;

  const handleToggleStatus = (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    toast({
      title: "Status produk diubah",
      description: `Produk berhasil diubah menjadi ${newStatus === "active" ? "aktif" : "tidak aktif"}.`,
    })
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
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter((p) => p.status === "active").length} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.reduce((sum, p) => sum + p.sales, 0)}</div>
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
              {formatCurrency(products.reduce((sum, p) => sum + p.revenue, 0))}
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
              {(products.reduce((sum, p) => sum + p.rating, 0) / products.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              dari {products.reduce((sum, p) => sum + p.reviews, 0)} ulasan
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
                <TableHead>Varian & Harga</TableHead>
                <TableHead>Penjualan</TableHead>
                <TableHead>Pendapatan</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Dibuat: {new Date(product.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.variants.map((variant, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{variant.name}:</span>{" "}
                          <span className="text-primary">{formatCurrency(variant.price)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.sales}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {product.downloads} download
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">{formatCurrency(product.revenue)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{product.rating}</span>
                      <span className="text-sm text-muted-foreground">({product.reviews})</span>
                    </div>
                  </TableCell>
                  <TableCell>
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

          {filteredProducts.length === 0 && (
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
