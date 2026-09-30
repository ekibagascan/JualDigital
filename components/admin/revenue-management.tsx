"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  DollarSign,
  Percent,
  Wallet,
  ShoppingCart,
  Clock,
  RefreshCw,
  Search,
  ArrowUpRight,
  Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

const POLL_MS = 12_000

interface RevenueMetrics {
  grossSales: number
  platformCommission: number
  sellerEarnings: number
  paidItemCount: number
  paidOrdersCount: number
  pendingOrdersCount: number
  paidOrdersAmount: number
  pendingOrdersAmount: number
  todayGross: number
  todayCommission: number
  monthGross: number
  monthCommission: number
  withdrawalsPendingCount: number
  withdrawalsPendingAmount: number
  withdrawalsCompletedCount: number
  withdrawalsCompletedAmount: number
  platformNet: number
}

interface RevenueTransaction {
  id: string
  orderId: string
  orderNumber: string
  date: string
  paidAt: string | null
  buyerName: string
  buyerEmail: string
  productTitle: string
  productId: string
  sellerName: string
  quantity: number
  unitPrice: number
  gross: number
  platformFee: number
  sellerEarnings: number
  paymentMethod: string
  paymentProvider: string
  status: string
  transactionId: string | null
}

interface RevenueResponse {
  metrics: RevenueMetrics
  transactions: RevenueTransaction[]
  meta: { generatedAt: string; pollHintSeconds: number; note: string }
}

const emptyMetrics: RevenueMetrics = {
  grossSales: 0,
  platformCommission: 0,
  sellerEarnings: 0,
  paidItemCount: 0,
  paidOrdersCount: 0,
  pendingOrdersCount: 0,
  paidOrdersAmount: 0,
  pendingOrdersAmount: 0,
  todayGross: 0,
  todayCommission: 0,
  monthGross: 0,
  monthCommission: 0,
  withdrawalsPendingCount: 0,
  withdrawalsPendingAmount: 0,
  withdrawalsCompletedCount: 0,
  withdrawalsCompletedAmount: 0,
  platformNet: 0,
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function RevenueManagement() {
  const [metrics, setMetrics] = useState<RevenueMetrics>(emptyMetrics)
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mounted, setMounted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchRevenue = useCallback(async (opts?: { silent?: boolean }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (opts?.silent) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        t: String(Date.now()),
        includePending: "1",
      })
      if (statusFilter === "paid" || statusFilter === "pending") {
        params.set("status", statusFilter)
      }

      const response = await fetch(`/api/admin/revenue?${params}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error("Gagal memuat data pendapatan")
      }

      const data: RevenueResponse = await response.json()
      setMetrics(data.metrics)
      setTransactions(data.transactions)
      setLastUpdated(data.meta?.generatedAt || new Date().toISOString())
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      console.error("[RevenueManagement]", err)
      setError("Gagal memuat data pendapatan")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!mounted) return
    fetchRevenue()
    const id = setInterval(() => fetchRevenue({ silent: true }), POLL_MS)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [mounted, fetchRevenue])

  const filtered = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      tx.orderNumber?.toLowerCase().includes(q) ||
      tx.buyerName?.toLowerCase().includes(q) ||
      tx.buyerEmail?.toLowerCase().includes(q) ||
      tx.productTitle?.toLowerCase().includes(q) ||
      tx.sellerName?.toLowerCase().includes(q) ||
      tx.paymentMethod?.toLowerCase().includes(q)
    )
  })

  if (!mounted || (loading && !lastUpdated)) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pendapatan</h2>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-28 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pendapatan</h2>
          <p className="text-muted-foreground">
            Penjualan kotor, komisi platform (~3%), dan bagi hasil seller — hanya pesanan lunas.
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Diperbarui otomatis tiap {POLL_MS / 1000} dtk · terakhir{" "}
              {formatDate(lastUpdated)}
              {refreshing ? " · menyegarkan…" : ""}
            </p>
          )}
        </div>
        <Button
          onClick={() => fetchRevenue({ silent: true })}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Penjualan Kotor"
          value={formatCurrency(metrics.grossSales)}
          hint={`${metrics.paidOrdersCount} pesanan lunas · ${metrics.paidItemCount} item`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Komisi Platform"
          value={formatCurrency(metrics.platformCommission)}
          hint={`Bulan ini ${formatCurrency(metrics.monthCommission)} · Hari ini ${formatCurrency(metrics.todayCommission)}`}
          icon={<Percent className="h-4 w-4" />}
          accent="text-emerald-700"
        />
        <MetricCard
          title="Pendapatan Seller"
          value={formatCurrency(metrics.sellerEarnings)}
          hint="97% dari item lunas (seller_earnings)"
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          title="Pesanan Menunggu"
          value={formatCurrency(metrics.pendingOrdersAmount)}
          hint={`${metrics.pendingOrdersCount} pesanan · belum dihitung sebagai pendapatan`}
          icon={<Clock className="h-4 w-4" />}
          accent="text-amber-700"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pesanan Lunas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{metrics.paidOrdersCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total order {formatCurrency(metrics.paidOrdersAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Penarikan Menunggu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(metrics.withdrawalsPendingAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.withdrawalsPendingCount} permintaan · tidak mengurangi komisi platform
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Penarikan Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(metrics.withdrawalsCompletedAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.withdrawalsCompletedCount} selesai/disetujui · dana seller keluar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Detail Transaksi</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Per item pesanan · komisi = (harga×qty) − seller_earnings
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {filtered.length} baris
            </Badge>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor pesanan, pembeli, produk…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua (lunas + menunggu)</SelectItem>
                <SelectItem value="paid">Lunas saja</SelectItem>
                <SelectItem value="pending">Menunggu saja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pesanan</TableHead>
                <TableHead>Pembeli</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Kotor</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead className="text-right">Seller</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${tx.orderId}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {tx.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <p className="text-sm font-medium truncate">{tx.buyerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.buyerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[160px]">
                        <p className="text-sm truncate">{tx.productTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.quantity}× · {tx.sellerName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(tx.gross)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700 whitespace-nowrap">
                      {formatCurrency(tx.platformFee)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(tx.sellerEarnings)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{tx.paymentMethod}</span>
                      {tx.paymentProvider !== tx.paymentMethod && (
                        <p className="text-xs text-muted-foreground">{tx.paymentProvider}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tx.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string
  value: string
  hint: string
  icon: ReactNode
  accent?: string
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tracking-tight ${accent || ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10">Lunas</Badge>
  }
  if (status === "pending") {
    return <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Menunggu</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}
