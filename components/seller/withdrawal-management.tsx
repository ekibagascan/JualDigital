"use client"

import { useState, useEffect } from "react"
import { DollarSign, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { withdrawalService, type Withdrawal } from "@/lib/withdrawal-service"

export function WithdrawalManagement() {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [balance, setBalance] = useState({
    available: 0,
    pending: 0,
    approved: 0,
    total: 0,
    minimumWithdrawal: 100000,
  })
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    method: "",
    accountNumber: "",
    accountName: "",
    bankName: "",
  })

  // Fetch withdrawals and balance
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch withdrawals
        const withdrawalsData = await withdrawalService.getSellerWithdrawals(user.id)
        setWithdrawals(withdrawalsData)

        // Fetch balance
        const earnings = await withdrawalService.getSellerEarnings(user.id)
        const pendingAmount = withdrawalsData
          .filter(w => w.status === 'pending')
          .reduce((sum, w) => sum + w.amount, 0)
        const approvedAmount = withdrawalsData
          .filter(w => w.status === 'approved')
          .reduce((sum, w) => sum + w.amount, 0)

        setBalance({
          available: earnings.available_balance,
          pending: pendingAmount,
          approved: approvedAmount,
          total: earnings.total_earnings,
          minimumWithdrawal: 100000,
        })
      } catch (error) {
        console.error('Error fetching withdrawal data:', error)
        toast({
          title: "Error",
          description: "Gagal memuat data penarikan",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground">Silakan login untuk mengakses halaman ini</p>
      </div>
    )
  }

  const handleWithdrawalRequest = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.method || !withdrawalForm.accountNumber || !withdrawalForm.bankName || !withdrawalForm.accountName) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseInt(withdrawalForm.amount)
    if (amount < balance.minimumWithdrawal) {
      toast({
        title: "Jumlah tidak valid",
        description: `Minimum penarikan adalah ${formatCurrency(balance.minimumWithdrawal)}.`,
        variant: "destructive",
      })
      return
    }

    if (amount > balance.available) {
      toast({
        title: "Saldo tidak mencukupi",
        description: "Jumlah penarikan melebihi saldo yang tersedia.",
        variant: "destructive",
      })
      return
    }

    try {
      await withdrawalService.createWithdrawal({
        seller_id: user.id,
        amount,
        bank_name: withdrawalForm.bankName,
        account_number: withdrawalForm.accountNumber,
        account_name: withdrawalForm.accountName,
      })

      toast({
        title: "Permintaan penarikan berhasil",
        description: "Permintaan Anda akan diproses dalam 1-3 hari kerja.",
      })

      setIsDialogOpen(false)
      setWithdrawalForm({
        amount: "",
        method: "",
        accountNumber: "",
        accountName: "",
        bankName: "",
      })

      // Refresh data
      const withdrawalsData = await withdrawalService.getSellerWithdrawals(user.id)
      setWithdrawals(withdrawalsData)
    } catch (error) {
      console.error('Error creating withdrawal:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengajukan penarikan",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Selesai</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
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
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Penarikan Dana</h1>
          <p className="text-muted-foreground">Kelola penarikan penghasilan Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tarik Dana
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Permintaan Penarikan Dana</DialogTitle>
              <DialogDescription>Isi form di bawah untuk mengajukan penarikan dana</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Jumlah Penarikan</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Masukkan jumlah"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: {formatCurrency(balance.minimumWithdrawal)} | Tersedia:{" "}
                  {formatCurrency(balance.available)}
                </p>
              </div>

              <div>
                <Label htmlFor="method">Metode Penarikan</Label>
                <Select
                  value={withdrawalForm.method}
                  onValueChange={(value) => setWithdrawalForm((prev) => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {withdrawalForm.method === "bank" && (
                <>
                  <div>
                    <Label htmlFor="bankName">Nama Bank</Label>
                    <Select
                      value={withdrawalForm.bankName}
                      onValueChange={(value) => setWithdrawalForm((prev) => ({ ...prev, bankName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bca">BCA</SelectItem>
                        <SelectItem value="mandiri">Mandiri</SelectItem>
                        <SelectItem value="bni">BNI</SelectItem>
                        <SelectItem value="bri">BRI</SelectItem>
                        <SelectItem value="cimb">CIMB Niaga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Nomor Rekening</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Masukkan nomor rekening"
                      value={withdrawalForm.accountNumber}
                      onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
                    <Input
                      id="accountName"
                      placeholder="Masukkan nama pemilik rekening"
                      value={withdrawalForm.accountName}
                      onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, accountName: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {withdrawalForm.method === "ewallet" && (
                <>
                  <div>
                    <Label htmlFor="bankName">Jenis E-Wallet</Label>
                    <Select
                      value={withdrawalForm.bankName}
                      onValueChange={(value) => setWithdrawalForm((prev) => ({ ...prev, bankName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih e-wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gopay">GoPay</SelectItem>
                        <SelectItem value="ovo">OVO</SelectItem>
                        <SelectItem value="dana">DANA</SelectItem>
                        <SelectItem value="shopeepay">ShopeePay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Nomor HP</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Masukkan nomor HP"
                      value={withdrawalForm.accountNumber}
                      onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountName">Nama Pemilik Akun</Label>
                    <Input
                      id="accountName"
                      placeholder="Masukkan nama pemilik akun"
                      value={withdrawalForm.accountName}
                      onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, accountName: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-1">Informasi Penting:</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• Penarikan diproses dalam 1-3 hari kerja</li>
                  <li>• Biaya admin: Rp 5.000 (Bank) / Rp 2.500 (E-Wallet)</li>
                  <li>• Pastikan data rekening/akun benar</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Batal
                </Button>
                <Button onClick={handleWithdrawalRequest} className="flex-1">
                  Ajukan Penarikan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Tersedia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(balance.available)}</div>
            <p className="text-xs text-muted-foreground">Siap untuk ditarik</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Tertunda</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(balance.pending)}</div>
            <p className="text-xs text-muted-foreground">Menunggu konfirmasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disetujui</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(balance.approved)}</div>
            <p className="text-xs text-muted-foreground">Sedang diproses transfer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance.total)}</div>
            <p className="text-xs text-muted-foreground">Keseluruhan saldo</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penarikan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{new Date(withdrawal.created_at).toLocaleDateString("id-ID")}</div>
                        {withdrawal.processed_at && (
                          <div className="text-sm text-muted-foreground">
                            Diproses: {new Date(withdrawal.processed_at).toLocaleDateString("id-ID")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          Biaya admin: Rp 0 (Komisi 3% per transaksi penjualan)
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">Bank Transfer</div>
                        <div className="text-sm text-muted-foreground">{withdrawal.bank_name} - {withdrawal.account_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {withdrawal.status === "rejected" && withdrawal.rejection_reason ? (
                        <div className="text-sm text-red-600">{withdrawal.rejection_reason}</div>
                      ) : withdrawal.status === "pending" ? (
                        <div className="text-sm text-muted-foreground">Menunggu persetujuan admin</div>
                      ) : withdrawal.status === "completed" ? (
                        <div className="text-sm text-green-600">Berhasil ditransfer</div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && withdrawals.length === 0 && (
            <div className="text-center py-16">
              <CreditCard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Belum ada riwayat penarikan</h3>
              <p className="text-muted-foreground">Penarikan pertama Anda akan muncul di sini</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
