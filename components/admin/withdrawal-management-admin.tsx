"use client"

import { useState } from "react"
import {
  CreditCard,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Download,
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
const mockWithdrawals = [
  {
    id: "WD-001",
    author: "Sarah Design",
    authorEmail: "sarah.design@email.com",
    amount: 2500000,
    adminFee: 5000,
    netAmount: 2495000,
    method: "Bank Transfer",
    bankName: "BCA",
    accountNumber: "1234567890",
    accountName: "Sarah Design",
    status: "pending",
    requestDate: "2024-01-25T10:30:00Z",
    processedDate: null,
    notes: "Penarikan rutin bulanan",
    availableBalance: 3200000,
  },
  {
    id: "WD-002",
    author: "Tech Guru",
    authorEmail: "tech.guru@email.com",
    amount: 1800000,
    adminFee: 5000,
    netAmount: 1795000,
    method: "Bank Transfer",
    bankName: "Mandiri",
    accountNumber: "0987654321",
    accountName: "Tech Guru",
    status: "approved",
    requestDate: "2024-01-24T14:15:00Z",
    processedDate: "2024-01-25T09:00:00Z",
    processedBy: "Admin",
    notes: "Penarikan untuk investasi",
    availableBalance: 2100000,
  },
  {
    id: "WD-003",
    author: "Code Master",
    authorEmail: "code.master@email.com",
    amount: 5000000,
    adminFee: 5000,
    netAmount: 4995000,
    method: "E-Wallet",
    bankName: "GoPay",
    accountNumber: "081234567890",
    accountName: "Code Master",
    status: "rejected",
    requestDate: "2024-01-23T16:45:00Z",
    processedDate: "2024-01-24T10:30:00Z",
    processedBy: "Admin",
    rejectionReason: "Jumlah penarikan melebihi batas maksimal bulanan",
    notes: "Penarikan besar untuk pembelian peralatan",
    availableBalance: 5200000,
  },
]

const mockStats = {
  totalWithdrawals: 245,
  pendingWithdrawals: 23,
  approvedWithdrawals: 198,
  rejectedWithdrawals: 24,
  totalAmount: 125450000,
  pendingAmount: 12340000,
  processedAmount: 113110000,
  averageProcessingTime: 2.5, // days
}

export function WithdrawalManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  const [rejectionReason, setRejectionReason] = useState("")

  const filteredWithdrawals = mockWithdrawals.filter((withdrawal) => {
    const matchesSearch =
      withdrawal.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      withdrawal.authorEmail.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter
    const matchesMethod = methodFilter === "all" || withdrawal.method === methodFilter
    return matchesSearch && matchesStatus && matchesMethod
  })

  const handleViewDetails = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal)
    setIsDetailDialogOpen(true)
  }

  const handleApproveWithdrawal = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("approve")
    setIsApprovalDialogOpen(true)
  }

  const handleRejectWithdrawal = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("reject")
    setIsApprovalDialogOpen(true)
  }

  const handleConfirmApproval = () => {
    if (approvalAction === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penolakan penarikan.",
        variant: "destructive",
      })
      return
    }

    const actionText = approvalAction === "approve" ? "disetujui" : "ditolak"
    toast({
      title: `Penarikan ${actionText}`,
      description: `Penarikan ${selectedWithdrawal?.id} berhasil ${actionText}.`,
    })

    setIsApprovalDialogOpen(false)
    setRejectionReason("")
    setSelectedWithdrawal(null)
  }

  const handleExportData = () => {
    toast({
      title: "Export dimulai",
      description: "Data penarikan sedang diekspor. Anda akan menerima file dalam beberapa menit.",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu Persetujuan</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Selesai</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "Bank Transfer":
        return <Badge variant="outline">Transfer Bank</Badge>
      case "E-Wallet":
        return <Badge variant="outline">E-Wallet</Badge>
      default:
        return <Badge variant="outline">{method}</Badge>
    }
  }

  const getPriorityBadge = (amount: number) => {
    if (amount >= 5000000) {
      return <Badge className="bg-red-100 text-red-800">High Priority</Badge>
    } else if (amount >= 2000000) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Normal</Badge>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Penarikan Dana</h1>
          <p className="text-muted-foreground">Kelola permintaan penarikan dana dari author</p>
        </div>
        <Button onClick={handleExportData}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penarikan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalWithdrawals}</div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="text-yellow-600">{mockStats.pendingWithdrawals} pending</span>
              <span className="text-green-600">{mockStats.approvedWithdrawals} approved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Persetujuan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mockStats.pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(mockStats.pendingAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diproses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockStats.processedAmount)}</div>
            <p className="text-xs text-muted-foreground">Dana yang telah ditransfer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Proses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.averageProcessingTime} hari</div>
            <p className="text-xs text-muted-foreground">Waktu pemrosesan rata-rata</p>
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
                  placeholder="Cari penarikan..."
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
                <SelectItem value="pending">Menunggu Persetujuan</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="Bank Transfer">Transfer Bank</SelectItem>
                <SelectItem value="E-Wallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Penarikan Dana</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID & Author</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Metode & Akun</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{withdrawal.id}</div>
                      <div className="text-sm text-muted-foreground">{withdrawal.author}</div>
                      <div className="text-xs text-muted-foreground">{withdrawal.authorEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                      <div className="text-sm text-muted-foreground">Fee: {formatCurrency(withdrawal.adminFee)}</div>
                      <div className="text-sm font-medium text-green-600">
                        Net: {formatCurrency(withdrawal.netAmount)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {getMethodBadge(withdrawal.method)}
                      <div className="text-sm text-muted-foreground mt-1">
                        {withdrawal.bankName} - {withdrawal.accountNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">a/n {withdrawal.accountName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(withdrawal.status)}
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    {withdrawal.status === "rejected" && withdrawal.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1 max-w-48">{withdrawal.rejectionReason}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Request: {new Date(withdrawal.requestDate).toLocaleDateString("id-ID")}</div>
                      {withdrawal.processedDate && (
                        <div className="text-muted-foreground">
                          Processed: {new Date(withdrawal.processedDate).toLocaleDateString("id-ID")}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityBadge(withdrawal.amount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(withdrawal)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        {withdrawal.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApproveWithdrawal(withdrawal)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Setujui Penarikan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRejectWithdrawal(withdrawal)}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Tolak Penarikan
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Penarikan Dana</DialogTitle>
            <DialogDescription>Informasi lengkap penarikan {selectedWithdrawal?.id}</DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Informasi Author</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama:</span>
                      <span className="font-medium">{selectedWithdrawal.author}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedWithdrawal.authorEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo Tersedia:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.availableBalance)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Informasi Penarikan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee Admin:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.adminFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah Net:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.netAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metode:</span>
                      <span className="font-medium">{selectedWithdrawal.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">{selectedWithdrawal.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. Rekening:</span>
                      <span className="font-medium">{selectedWithdrawal.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atas Nama:</span>
                      <span className="font-medium">{selectedWithdrawal.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{selectedWithdrawal.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tanggal Request:</span>
                      <span className="font-medium">
                        {new Date(selectedWithdrawal.requestDate).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    {selectedWithdrawal.processedDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tanggal Diproses:</span>
                        <span className="font-medium">
                          {new Date(selectedWithdrawal.processedDate).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    )}
                    {selectedWithdrawal.processedBy && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diproses Oleh:</span>
                        <span className="font-medium">{selectedWithdrawal.processedBy}</span>
                      </div>
                    )}
                    {selectedWithdrawal.rejectionReason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alasan Penolakan:</span>
                        <span className="font-medium">{selectedWithdrawal.rejectionReason}</span>
                      </div>
                    )}
                    {selectedWithdrawal.notes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Catatan:</span>
                        <span className="font-medium">{selectedWithdrawal.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{approvalAction === "approve" ? "Setujui Penarikan" : "Tolak Penarikan"}</DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "Anda akan menyetujui penarikan ini."
                : "Anda akan menolak penarikan ini."}
            </DialogDescription>
          </DialogHeader>
          {approvalAction === "reject" && (
            <div className="mb-4">
              <Label htmlFor="rejectionReason">Alasan Penolakan</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
              />
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleConfirmApproval}>{approvalAction === "approve" ? "Setujui" : "Tolak"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
