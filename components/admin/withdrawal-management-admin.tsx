"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { type Withdrawal, withdrawalService } from "@/lib/withdrawal-service"

interface WithdrawalWithProfile extends Withdrawal {
  profiles?: {
    name?: string
    business_name?: string
    total_earnings?: number
  }
}

export function WithdrawalManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithProfile | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug: Log when withdrawals state changes
  // Auto-refresh every 30 seconds to keep data fresh
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/withdrawals/?t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setWithdrawals(data.withdrawals || [])
        }
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (mounted) {
      const fetchWithdrawals = async () => {
        setLoading(true)
        try {
          const response = await fetch(`/api/admin/withdrawals/?t=${Date.now()}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch withdrawals: ${response.status}`)
          }

          const data = await response.json()
          setWithdrawals(data.withdrawals || [])
        } catch (error) {
          console.error('Error fetching withdrawals:', error)
          toast({
            title: "Error",
            description: "Gagal memuat data penarikan",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }

      fetchWithdrawals()
    }
  }, [mounted])

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const authorName = withdrawal.profiles?.name || withdrawal.profiles?.business_name || "Unknown"
    const matchesSearch =
      authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewDetails = (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setIsDetailDialogOpen(true)
  }

  const handleApproveWithdrawal = (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("approve")
    setIsApprovalDialogOpen(true)
  }

  const handleRejectWithdrawal = (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("reject")
    setIsApprovalDialogOpen(true)
  }

  const handleConfirmApproval = async () => {
    if (!selectedWithdrawal) return

    if (approvalAction === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penolakan penarikan.",
        variant: "destructive",
      })
      return
    }

    try {
      const status = approvalAction === "approve" ? "approved" : "rejected"
      const updateData: { status: string; rejection_reason?: string } = { status }

      if (approvalAction === "reject" && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('Failed to update withdrawal status')
      }

      const actionText = approvalAction === "approve" ? "disetujui" : "ditolak"
      toast({
        title: `Penarikan ${actionText}`,
        description: `Penarikan ${selectedWithdrawal.id} berhasil ${actionText}.`,
      })

      // Refresh withdrawals with a small delay to ensure database is updated
      setTimeout(async () => {
        try {
          const refreshResponse = await fetch(`/api/admin/withdrawals/?t=${Date.now()}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            setWithdrawals(data.withdrawals || [])
          }
        } catch (error) {
          console.error('Error refreshing withdrawals:', error)
        }
      }, 500) // 500ms delay

      setIsApprovalDialogOpen(false)
      setRejectionReason("")
      setSelectedWithdrawal(null)
    } catch (error) {
      console.error('Error updating withdrawal:', error)
      toast({
        title: "Error",
        description: "Gagal memperbarui status penarikan",
        variant: "destructive",
      })
    }
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
          <p className="text-muted-foreground">Memuat data penarikan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Penarikan Dana</h1>
          <p className="text-muted-foreground">Kelola permintaan penarikan dana dari author</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true)
              fetch(`/api/admin/withdrawals/?t=${Date.now()}`, {
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              })
                .then(res => res.json())
                .then(data => {
                  setWithdrawals(data.withdrawals || [])
                  setLoading(false)
                })
                .catch(error => {
                  console.error('Error refreshing:', error)
                  setLoading(false)
                })
            }}
            disabled={loading}
          >
            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penarikan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawals.length}</div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="text-yellow-600">{withdrawals.filter(w => w.status === 'pending').length} pending</span>
              <span className="text-green-600">{withdrawals.filter(w => w.status === 'approved').length} approved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Persetujuan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{withdrawals.filter(w => w.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diproses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').reduce((sum, w) => sum + w.amount, 0))}</div>
            <p className="text-xs text-muted-foreground">Dana yang telah ditransfer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Proses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5 hari</div>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{withdrawal.id}</div>
                        <div className="text-sm text-muted-foreground">{withdrawal.profiles?.name || withdrawal.profiles?.business_name || "Unknown"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                        <div className="text-sm text-muted-foreground">Fee: Rp 0 (Komisi 3% per transaksi penjualan)</div>
                        <div className="text-sm font-medium text-green-600">
                          Net: {formatCurrency(withdrawal.amount)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {getMethodBadge("Bank Transfer")}
                        <div className="text-sm text-muted-foreground mt-1">
                          {withdrawal.bank_name} - {withdrawal.account_number}
                        </div>
                        <div className="text-xs text-muted-foreground">a/n {withdrawal.account_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      {withdrawal.status === "rejected" && withdrawal.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1 max-w-48">{withdrawal.rejection_reason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Request: {new Date(withdrawal.created_at).toLocaleDateString("id-ID")}</div>
                        {withdrawal.processed_at && (
                          <div className="text-muted-foreground">
                            Processed: {new Date(withdrawal.processed_at).toLocaleDateString("id-ID")}
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
                ))
              )}
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
                      <span className="font-medium">{selectedWithdrawal.profiles?.name || selectedWithdrawal.profiles?.business_name || "Unknown"}</span>
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
                      <span className="font-medium">Rp 0 (Komisi 3% per transaksi penjualan)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah Net:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metode:</span>
                      <span className="font-medium">Bank Transfer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">{selectedWithdrawal.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No. Rekening:</span>
                      <span className="font-medium">{selectedWithdrawal.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atas Nama:</span>
                      <span className="font-medium">{selectedWithdrawal.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{selectedWithdrawal.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tanggal Request:</span>
                      <span className="font-medium">
                        {new Date(selectedWithdrawal.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    {selectedWithdrawal.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tanggal Diproses:</span>
                        <span className="font-medium">
                          {new Date(selectedWithdrawal.processed_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    )}
                    {selectedWithdrawal.rejection_reason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alasan Penolakan:</span>
                        <span className="font-medium">{selectedWithdrawal.rejection_reason}</span>
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
