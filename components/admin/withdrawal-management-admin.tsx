"use client"

import { useState, useEffect, useRef } from "react"
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
  AlertTriangle,
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
import { type Withdrawal } from "@/lib/withdrawal-service"

interface WithdrawalWithProfile extends Withdrawal {
  profiles?: {
    name?: string
    business_name?: string
    email?: string
    total_earnings?: number
  }
}

interface EarningsSummary {
  total_from_paid_orders: number
  deducted_withdrawals: {
    pending: number
    approved: number
    completed: number
    total: number
  }
  available_balance: number
  balance_before_this_request: number
  requested_amount: number
  would_exceed_balance: boolean
}

interface PlatformEarnings {
  total_gross_sales: number
  total_platform_fee: number
  commission_rate_note: string
}

interface PaidOrderHistoryItem {
  id: string
  order_number: string
  product_title: string
  date: string | null
  gross: number
  seller_earnings: number
  platform_fee: number
}

interface WithdrawalDetailPayload {
  withdrawal: WithdrawalWithProfile
  earnings_summary: EarningsSummary
  platform_earnings: PlatformEarnings
  recent_paid_orders: PaidOrderHistoryItem[]
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
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<WithdrawalDetailPayload | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  /** Preserve local status until list API catches up after approve/reject */
  const pendingStatusRef = useRef<Map<string, WithdrawalWithProfile["status"]>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  const mergeWithdrawals = (apiList: WithdrawalWithProfile[]) => {
    return apiList.map((row) => {
      const pending = pendingStatusRef.current.get(row.id)
      if (pending && row.status !== pending) {
        return { ...row, status: pending }
      }
      if (pending && row.status === pending) {
        pendingStatusRef.current.delete(row.id)
      }
      return row
    })
  }

  const fetchWithdrawalsList = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/withdrawals/?t=${Date.now()}&r=${Math.random().toString(36).slice(2)}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch withdrawals: ${response.status}`)
      }

      const data = await response.json()
      setWithdrawals(mergeWithdrawals(data.withdrawals || []))
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      if (!opts?.silent) {
        toast({
          title: "Error",
          description: "Gagal memuat data penarikan",
          variant: "destructive",
        })
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  // Auto-refresh every 30 seconds to keep data fresh
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      void fetchWithdrawalsList({ silent: true })
    }, 30000)

    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (mounted) {
      void fetchWithdrawalsList()
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

  const fetchWithdrawalDetail = async (withdrawalId: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(
        `/api/admin/withdrawals/${withdrawalId}/?t=${Date.now()}&r=${Math.random().toString(36).slice(2)}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      )
      if (!response.ok) {
        throw new Error(`Failed to fetch withdrawal detail: ${response.status}`)
      }
      const data = (await response.json()) as WithdrawalDetailPayload
      setDetailData(data)
      if (data.withdrawal) {
        setSelectedWithdrawal(data.withdrawal)
      }
      return data
    } catch (error) {
      console.error("Error fetching withdrawal detail:", error)
      setDetailData(null)
      toast({
        title: "Error",
        description: "Gagal memuat detail penarikan & riwayat transaksi",
        variant: "destructive",
      })
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewDetails = async (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setDetailData(null)
    setIsDetailDialogOpen(true)
    await fetchWithdrawalDetail(withdrawal.id)
  }

  const handleApproveWithdrawal = async (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("approve")
    setIsApprovalDialogOpen(true)
    await fetchWithdrawalDetail(withdrawal.id)
  }

  const handleRejectWithdrawal = (withdrawal: WithdrawalWithProfile) => {
    setSelectedWithdrawal(withdrawal)
    setApprovalAction("reject")
    setIsApprovalDialogOpen(true)
  }

  const wouldExceed =
    detailData?.earnings_summary?.would_exceed_balance === true &&
    detailData?.withdrawal?.id === selectedWithdrawal?.id

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

    if (approvalAction === "approve" && wouldExceed) {
      toast({
        title: "Tidak dapat disetujui",
        description: "Jumlah penarikan melebihi saldo tersedia seller.",
        variant: "destructive",
      })
      return
    }

    const previous = selectedWithdrawal
    const status = approvalAction === "approve" ? "approved" : "rejected"
    const updateData: { status: string; rejection_reason?: string } = { status }

    if (approvalAction === "reject" && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    setActionLoading(true)
    try {
      pendingStatusRef.current.set(previous.id, status)
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === previous.id
            ? {
                ...w,
                status: status as WithdrawalWithProfile["status"],
                rejection_reason: updateData.rejection_reason,
                processed_at: new Date().toISOString(),
              }
            : w
        )
      )

      const response = await fetch(`/api/admin/withdrawals/${previous.id}/`, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        pendingStatusRef.current.delete(previous.id)
        setWithdrawals((prev) =>
          prev.map((w) => (w.id === previous.id ? { ...w, ...previous } : w))
        )
        throw new Error(
          typeof result?.error === "string" ? result.error : "Failed to update withdrawal status"
        )
      }

      if (result.withdrawal) {
        pendingStatusRef.current.set(previous.id, result.withdrawal.status)
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === previous.id
              ? { ...w, ...result.withdrawal, profiles: w.profiles }
              : w
          )
        )
      }

      const actionText = approvalAction === "approve" ? "disetujui" : "ditolak"
      toast({
        title: `Penarikan ${actionText}`,
        description: `Penarikan ${previous.id} berhasil ${actionText}.`,
      })

      setIsApprovalDialogOpen(false)
      setIsDetailDialogOpen(false)
      setRejectionReason("")
      setSelectedWithdrawal(null)
      setDetailData(null)

      // Background sync — merge preserves pending status until DB list catches up
      setTimeout(() => {
        void fetchWithdrawalsList({ silent: true })
      }, 500)
    } catch (error) {
      console.error("Error updating withdrawal:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal memperbarui status penarikan",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
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
              void fetchWithdrawalsList()
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
                        <div className="text-sm text-muted-foreground">Fee: Rp 0 (Komisi 5% per transaksi penjualan)</div>
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
      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open)
          if (!open) {
            setDetailData(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Penarikan Dana</DialogTitle>
            <DialogDescription>Informasi lengkap penarikan {selectedWithdrawal?.id}</DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-6">
              {detailLoading && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Memuat riwayat & perhitungan saldo...
                </div>
              )}

              {detailData?.earnings_summary?.would_exceed_balance && (
                <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">PERINGATAN: Melebihi saldo tersedia</p>
                      <p>
                        Diminta {formatCurrency(detailData.earnings_summary.requested_amount)} — saldo yang
                        dapat menutupi permintaan ini hanya{" "}
                        {formatCurrency(detailData.earnings_summary.balance_before_this_request)}.
                        Jangan setujui. Fee penarikan Rp 0 (disengaja); High Priority jika ≥ Rp 5jt.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Informasi Author</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Nama:</span>
                      <span className="font-medium text-right">
                        {selectedWithdrawal.profiles?.name ||
                          selectedWithdrawal.profiles?.business_name ||
                          "Unknown"}
                      </span>
                    </div>
                    {selectedWithdrawal.profiles?.email && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium text-right">{selectedWithdrawal.profiles.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Informasi Penarikan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah diminta:</span>
                      <span className="font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee penarikan:</span>
                      <span className="font-medium">Rp 0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metode:</span>
                      <span className="font-medium">Transfer Bank (manual)</span>
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
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Alasan Penolakan:</span>
                        <span className="font-medium text-right">{selectedWithdrawal.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {detailData?.earnings_summary && (
                <div className="rounded-md border p-4 space-y-3">
                  <h4 className="font-medium">Perhitungan Saldo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total earnings (order paid):</span>
                      <span className="font-medium">
                        {formatCurrency(detailData.earnings_summary.total_from_paid_orders)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">− Penarikan pending:</span>
                      <span>
                        {formatCurrency(detailData.earnings_summary.deducted_withdrawals.pending)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">− Penarikan approved:</span>
                      <span>
                        {formatCurrency(detailData.earnings_summary.deducted_withdrawals.approved)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">− Penarikan completed:</span>
                      <span>
                        {formatCurrency(detailData.earnings_summary.deducted_withdrawals.completed)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Saldo tersedia (setelah semua penarikan):</span>
                      <span className="font-medium">
                        {formatCurrency(detailData.earnings_summary.available_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo penutup permintaan ini:</span>
                      <span>
                        {formatCurrency(detailData.earnings_summary.balance_before_this_request)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah diminta:</span>
                      <span
                        className={
                          detailData.earnings_summary.would_exceed_balance
                            ? "font-semibold text-red-700"
                            : "font-medium"
                        }
                      >
                        {formatCurrency(detailData.earnings_summary.requested_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {detailData?.platform_earnings && (
                <div className="rounded-md border p-4 space-y-2">
                  <h4 className="font-medium">Keuntungan Platform</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total penjualan kotor (paid):</span>
                      <span className="font-medium">
                        {formatCurrency(detailData.platform_earnings.total_gross_sales)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Komisi platform (~5%):</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(detailData.platform_earnings.total_platform_fee)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {detailData.platform_earnings.commission_rate_note}
                    </p>
                  </div>
                </div>
              )}

              {detailData && (
                <div className="space-y-2">
                  <h4 className="font-medium">Riwayat Transaksi (order paid)</h4>
                  {detailData.recent_paid_orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tidak ada order berstatus paid untuk seller ini.
                    </p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">Earnings seller</TableHead>
                            <TableHead className="text-right">Fee platform</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailData.recent_paid_orders.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">{item.order_number}</TableCell>
                              <TableCell className="max-w-[160px] truncate">{item.product_title}</TableCell>
                              <TableCell className="text-sm">
                                {item.date
                                  ? new Date(item.date).toLocaleDateString("id-ID")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(item.gross)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(item.seller_earnings)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-emerald-700">
                                {formatCurrency(item.platform_fee)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {selectedWithdrawal.status === "pending" && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setApprovalAction("reject")
                      setIsApprovalDialogOpen(true)
                    }}
                  >
                    Tolak
                  </Button>
                  <Button
                    disabled={detailLoading || wouldExceed}
                    onClick={() => {
                      if (wouldExceed) return
                      setApprovalAction("approve")
                      setIsApprovalDialogOpen(true)
                    }}
                  >
                    Setujui
                  </Button>
                </div>
              )}
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
                ? "Anda akan menyetujui penarikan ini (transfer bank manual)."
                : "Anda akan menolak penarikan ini."}
            </DialogDescription>
          </DialogHeader>
          {approvalAction === "approve" && wouldExceed && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Tidak dapat disetujui: jumlah melebihi saldo tersedia seller
                {detailData?.earnings_summary
                  ? ` (${formatCurrency(detailData.earnings_summary.requested_amount)} > ${formatCurrency(detailData.earnings_summary.balance_before_this_request)})`
                  : ""}
                .
              </span>
            </div>
          )}
          {approvalAction === "approve" && detailLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Memverifikasi saldo...
            </div>
          )}
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
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={
                actionLoading ||
                (approvalAction === "approve" && (detailLoading || wouldExceed))
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : approvalAction === "approve" ? (
                "Setujui"
              ) : (
                "Tolak"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
