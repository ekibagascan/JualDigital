"use client"

import { useState } from "react"
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
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

// Mock data
const mockProducts = [
  {
    id: "1",
    title: "E-book Panduan Digital Marketing",
    author: "Ahmad Rizki",
    authorEmail: "ahmad.rizki@email.com",
    category: "E-book",
    price: 99000,
    variants: [
      { name: "Basic", price: 99000 },
      { name: "Premium", price: 149000 },
    ],
    sales: 234,
    revenue: 23166000,
    rating: 4.8,
    reviews: 45,
    status: "active",
    createdAt: "2024-01-15",
    approvedAt: "2024-01-16",
    image: "/placeholder.svg?height=100&width=150&text=E-book",
  },
  {
    id: "2",
    title: "Template Website Modern",
    author: "Sarah Design",
    authorEmail: "sarah.design@email.com",
    category: "Template",
    price: 199000,
    variants: [
      { name: "Single License", price: 199000 },
      { name: "Commercial License", price: 399000 },
    ],
    sales: 156,
    revenue: 31044000,
    rating: 4.9,
    reviews: 32,
    status: "pending",
    createdAt: "2024-01-20",
    approvedAt: null,
    image: "/placeholder.svg?height=100&width=150&text=Template",
  },
  {
    id: "3",
    title: "Kursus React & Next.js",
    author: "Tech Guru",
    authorEmail: "tech.guru@email.com",
    category: "Kursus Online",
    price: 299000,
    variants: [
      { name: "Basic Access", price: 299000 },
      { name: "Premium + Certificate", price: 499000 },
    ],
    sales: 89,
    revenue: 26611000,
    rating: 4.7,
    reviews: 28,
    status: "rejected",
    createdAt: "2024-01-18",
    approvedAt: null,
    rejectionReason: "Konten tidak sesuai dengan guidelines",
    image: "/placeholder.svg?height=100&width=150&text=Course",
  },
]

const mockStats = {
  totalProducts: 1245,
  activeProducts: 1089,
  pendingProducts: 89,
  rejectedProducts: 67,
  totalRevenue: 125450000,
  totalSales: 15420,
}

export function ProductManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [authorFilter, setAuthorFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [rejectionReason, setRejectionReason] = useState("")

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    const matchesAuthor = authorFilter === "all" || product.author.toLowerCase().includes(authorFilter.toLowerCase())
    return matchesSearch && matchesCategory && matchesStatus && matchesAuthor
  })

  const handleApproveProduct = (product: any) => {
    setSelectedProduct(product)
    setReviewAction("approve")
    setIsReviewDialogOpen(true)
  }

  const handleRejectProduct = (product: any) => {
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

  const handleDeleteProduct = (product: any) => {
    toast({
      title: "Produk dihapus",
      description: `Produk "${product.title}" berhasil dihapus dari platform.`,
      variant: "destructive",
    })
  }

  const handleToggleStatus = (product: any) => {
    const newStatus = product.status === "active" ? "inactive" : "active"
    toast({
      title: "Status produk diubah",
      description: `Produk berhasil diubah menjadi ${newStatus === "active" ? "aktif" : "tidak aktif"}.`,
    })
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
            <div className="text-2xl font-bold">{mockStats.totalProducts.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStats.activeProducts.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mockStats.pendingProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockStats.rejectedProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalSales.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockStats.totalRevenue)}</div>
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
          <CardTitle>Daftar Produk</CardTitle>
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
                        src={product.image || "/placeholder.svg"}
                        alt={product.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium line-clamp-2">{product.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Dibuat: {new Date(product.createdAt).toLocaleDateString("id-ID")}
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
                      <div>Terjual: {product.sales}</div>
                      <div className="text-green-600 font-medium">{formatCurrency(product.revenue)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(product.status)}
                      {getStatusBadge(product.status)}
                    </div>
                    {product.status === "rejected" && product.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1 max-w-48">{product.rejectionReason}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
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
                        <DropdownMenuItem>
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
    </div>
  )
}
