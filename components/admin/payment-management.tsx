"use client"

import { useState, useEffect } from "react"
import {
  CreditCard,
  Search,
  MoreHorizontal,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Payment {
  id: string
  orderId: string
  customer: string
  customerEmail: string
  product: string
  author: string
  amount: number
  platformFee: number
  authorEarnings: number
  paymentMethod: string
  paymentProvider: string
  status: string
  createdAt: string
  completedAt: string | null
  transactionId: string
  failureReason?: string
}

interface PaymentStats {
  totalTransactions: number
  completedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  totalRevenue: number
  platformRevenue: number
  authorRevenue: number
  todayRevenue: number
}

interface PaymentData {
  payments: Payment[]
  stats: PaymentStats
}

export function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    authorRevenue: 0,
    todayRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchPayments()
    }
  }, [mounted])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/payments/')
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }

      const data: PaymentData = await response.json()
      setPayments(data.payments)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      setError('Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter
    return matchesSearch && matchesStatus && matchesMethod
  })

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDetailDialogOpen(true)
  }

  const handleRefundPayment = (payment: Payment) => {
    toast({
      title: "Refund diproses",
      description: `Refund untuk pembayaran ${payment.id} sedang diproses.`,
    })
  }

  const handleExportData = () => {
    toast({
      title: "Export dimulai",
      description: "Data pembayaran sedang diekspor. Anda akan menerima file dalam beberapa menit.",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Berhasil</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Gagal</Badge>
      case "refunded":
        return <Badge className="bg-blue-100 text-blue-800">Refund</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "Credit Card":
        return <Badge variant="outline">Kartu Kredit</Badge>
      case "Bank Transfer":
        return <Badge variant="outline">Transfer Bank</Badge>
      case "E-Wallet":
        return <Badge variant="outline">E-Wallet</Badge>
      default:
        return <Badge variant="outline">{method}</Badge>
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data pembayaran...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchPayments}>Coba Lagi</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pembayaran</h1>
          <p className="text-muted-foreground">Monitor semua transaksi pembayaran</p>
        </div>
        <Button onClick={handleExportData}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards - responsive grid to prevent overflow */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString("id-ID")}</div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="text-green-600">{stats.completedTransactions} berhasil</span>
              <span className="text-yellow-600">{stats.pendingTransactions} pending</span>
              <span className="text-red-600">{stats.failedTransactions} gagal</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Semua waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.platformRevenue)}</div>
            <p className="text-xs text-muted-foreground">10% dari total revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">Transaksi hari ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 min-w-0">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cari pembayaran..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48 min-w-0">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Berhasil</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
                <SelectItem value="refunded">Refund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48 min-w-0">
                <SelectValue placeholder="Filter Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="Credit Card">Kartu Kredit</SelectItem>
                <SelectItem value="Bank Transfer">Transfer Bank</SelectItem>
                <SelectItem value="E-Wallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48 min-w-0">
                <SelectValue placeholder="Filter Tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pembayaran</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.id}</div>
                      <div className="text-sm text-muted-foreground">{payment.orderId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.customer}</div>
                      <div className="text-sm text-muted-foreground">{payment.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium line-clamp-2">{payment.product}</div>
                      <div className="text-sm text-muted-foreground">by {payment.author}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-muted-foreground">Fee: {formatCurrency(payment.platformFee)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {getMethodBadge(payment.paymentMethod)}
                      <div className="text-xs text-muted-foreground mt-1">{payment.paymentProvider}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      {getStatusBadge(payment.status)}
                    </div>
                    {payment.status === "failed" && payment.failureReason && (
                      <div className="text-xs text-red-600 mt-1">{payment.failureReason}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(payment.createdAt).toLocaleDateString("id-ID")}</div>
                      <div className="text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
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
                        <DropdownMenuItem onClick={() => handleViewDetails(payment)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        {payment.status === "completed" && (
                          <DropdownMenuItem onClick={() => handleRefundPayment(payment)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Proses Refund
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download Invoice
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

      {/* Payment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
            <DialogDescription>Informasi lengkap pembayaran {selectedPayment?.id}</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Informasi Pembayaran</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID Pembayaran:</span>
                      <span className="font-medium">{selectedPayment.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID Order:</span>
                      <span className="font-medium">{selectedPayment.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-medium">{selectedPayment.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedPayment.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Informasi Pelanggan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama:</span>
                      <span className="font-medium">{selectedPayment.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedPayment.customerEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metode:</span>
                      <span className="font-medium">{selectedPayment.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium">{selectedPayment.paymentProvider}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Informasi Produk</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produk:</span>
                    <span className="font-medium">{selectedPayment.product}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Author:</span>
                    <span className="font-medium">{selectedPayment.author}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Rincian Pembayaran</h4>
                <div className="space-y-2 text-sm border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Produk:</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (10%):</span>
                    <span className="font-medium">-{formatCurrency(selectedPayment.platformFee)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Penghasilan Author:</span>
                    <span className="text-green-600">{formatCurrency(selectedPayment.authorEarnings)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibuat:</span>
                    <span className="font-medium">{new Date(selectedPayment.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                  {selectedPayment.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selesai:</span>
                      <span className="font-medium">
                        {new Date(selectedPayment.completedAt).toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
