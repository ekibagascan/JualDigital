"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Package,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  status: string
  image_url: string | null
  created_at: string
  updated_at: string
  seller_id: string
  author: string
  authorEmail: string
  authorAvatar: string | null
  totalSold: number
  revenue: number
  rating: number
  reviews: number
  variants: Array<{ name: string; price: number }>
  featured?: boolean
}

interface ProductStats {
  totalProducts: number
  activeProducts: number
  pendingProducts: number
  rejectedProducts: number
  totalSales: number
  totalRevenue: number
}

interface ProductData {
  products: Product[]
  stats: ProductStats
}

export function ProductManagementAdmin() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [rejectionReason, setRejectionReason] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    pendingProducts: 0,
    rejectedProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchProducts()
    }
  }, [mounted])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/products/')
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data: ProductData = await response.json()
      setProducts(data.products)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setError('Gagal memuat data produk')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleApproveProduct = (product: Product) => {
    setSelectedProduct(product)
    setReviewAction("approve")
    setIsReviewDialogOpen(true)
  }

  const handleRejectProduct = (product: Product) => {
    setSelectedProduct(product)
    setReviewAction("reject")
    setIsReviewDialogOpen(true)
  }

  const handleConfirmReview = () => {
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penolakan produk.",
        variant: "destructive",
      })
      return
    }

    const actionText = reviewAction === "approve" ? "disetujui" : "ditolak"
    toast({
      title: `Produk ${actionText}`,
      description: `Produk "${selectedProduct?.title}" berhasil ${actionText}.`,
    })

    setIsReviewDialogOpen(false)
    setRejectionReason("")
    setSelectedProduct(null)
  }

  const handleViewDetail = (product: Product) => {
    router.push(`/product/${product.id}`)
  }

  const handleEditProduct = (product: Product) => {
    router.push(`/admin/products/edit/${product.id}`)
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      // Make API call to delete the product
      const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      toast({
        title: "Produk dihapus",
        description: `Produk "${productToDelete.title}" berhasil dihapus dari platform.`,
        variant: "destructive",
      })

      // Remove the product from the local state
      setProducts(products.filter(p => p.id !== productToDelete.id))

      // Update stats
      setStats(prev => ({
        ...prev,
        totalProducts: prev.totalProducts - 1,
        activeProducts: productToDelete.status === 'active' ? prev.activeProducts - 1 : prev.activeProducts,
        pendingProducts: productToDelete.status === 'pending' ? prev.pendingProducts - 1 : prev.pendingProducts,
        rejectedProducts: productToDelete.status === 'rejected' ? prev.rejectedProducts - 1 : prev.rejectedProducts,
      }))

      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast({
        title: "Gagal menghapus produk",
        description: "Terjadi kesalahan saat menghapus produk.",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === "active" ? "inactive" : "active"

      // Make API call to update the product status
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          status: newStatus,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product status');
      }

      toast({
        title: "Status produk diubah",
        description: `Produk berhasil diubah menjadi ${newStatus === "active" ? "aktif" : "tidak aktif"}.`,
      })

      // Update the product status in local state
      setProducts(products.map(p =>
        p.id === product.id ? { ...p, status: newStatus } : p
      ))

      // Update stats
      setStats(prev => ({
        ...prev,
        activeProducts: newStatus === 'active' ? prev.activeProducts + 1 : prev.activeProducts - 1,
      }))
    } catch (error) {
      console.error('Failed to update product status:', error);
      toast({
        title: "Gagal mengubah status",
        description: "Terjadi kesalahan saat mengubah status produk.",
        variant: "destructive",
      })
    }
  }

  const handleToggleFeatured = async (product: Product) => {
    try {
      const newFeaturedStatus = !product.featured

      // Make API call to update the featured status
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          featured: newFeaturedStatus,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }

      toast({
        title: "Status produk diubah",
        description: `Produk berhasil diubah menjadi ${newFeaturedStatus ? "diperjualbelikan" : "tidak diperjualbelikan"}.`,
      })

      // Update the featured status in local state
      setProducts(products.map(p =>
        p.id === product.id ? { ...p, featured: newFeaturedStatus } : p
      ))

      // Update stats if needed, e.g., if a product is featured, it's active
      setStats(prev => ({
        ...prev,
        activeProducts: newFeaturedStatus ? prev.activeProducts + 1 : prev.activeProducts - 1,
      }))
    } catch (error) {
      console.error('Failed to update featured status:', error);
      toast({
        title: "Gagal mengubah status",
        description: "Terjadi kesalahan saat mengubah status produk.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu Review</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Tidak Aktif</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID")
  }

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Produk</h1>
          <p className="text-muted-foreground">Kelola semua produk di platform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Produk</h1>
          <p className="text-muted-foreground">Kelola semua produk di platform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Memuat data produk...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Produk</h1>
          <p className="text-muted-foreground">Kelola semua produk di platform</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button onClick={fetchProducts} className="mt-2">
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Produk</h1>
        <p className="text-muted-foreground">Kelola semua produk di platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeProducts.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
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
                  placeholder="Cari produk atau author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Menunggu Review</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga & Varian</TableHead>
                <TableHead>Performa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.title}
                        className="w-16 h-12 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />
                      <div>
                        <div className="font-medium line-clamp-2">{product.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Dibuat: {formatDate(product.created_at)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.author}</div>
                      <div className="text-sm text-muted-foreground">{product.authorEmail}</div>
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
                    <div className="text-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{product.rating}</span>
                        <span className="text-muted-foreground">({product.reviews})</span>
                      </div>
                      <div>Terjual: {product.totalSold}</div>
                      <div className="text-green-600 font-medium">{formatCurrency(product.revenue)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(product.status)}
                      {getStatusBadge(product.status)}
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
                        <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        {product.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApproveProduct(product)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Setujui Produk
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRejectProduct(product)}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Tolak Produk
                            </DropdownMenuItem>
                          </>
                        )}
                        {product.status === "active" && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                            Nonaktifkan Produk
                          </DropdownMenuItem>
                        )}
                        {product.status === "inactive" && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                            Aktifkan Produk
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleFeatured(product)}>
                          {product.featured ? (
                            <XCircle className="w-4 h-4 mr-2 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          )}
                          {product.featured ? "Tidak Diperjualbelikan" : "Diperjualbelikan"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Produk
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus Produk
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Product Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? "Setujui Produk" : "Tolak Produk"}</DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? `Anda akan menyetujui produk "${selectedProduct?.title}" untuk dipublikasikan.`
                : `Anda akan menolak produk "${selectedProduct?.title}". Produk tidak akan dipublikasikan.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reviewAction === "reject" && (
              <div>
                <Label htmlFor="reason">Alasan Penolakan *</Label>
                <Textarea
                  id="reason"
                  placeholder="Jelaskan alasan penolakan produk..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={handleConfirmReview}
                variant={reviewAction === "approve" ? "default" : "destructive"}
                className="flex-1"
              >
                {reviewAction === "approve" ? "Setujui Produk" : "Tolak Produk"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk &quot;{productToDelete?.title}&quot; akan dihapus dari platform.
              Proses ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
