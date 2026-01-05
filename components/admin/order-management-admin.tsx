"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
    Search,
    MoreHorizontal,
    Eye,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    FileImage
} from "lucide-react"

interface Order {
    id: string
    order_number: string
    total_amount: number
    status: string
    created_at: string
    user_id: string
    userName: string
    userEmail: string
    items: OrderItem[]
    payment_provider?: string
    payment_proof_url?: string
    payment_proof_amount?: number
    payment_proof_date?: string
}

interface OrderItem {
    id: string
    product_id: string
    product_title: string
    quantity: number
    price: number
    seller_earnings: number
}

interface OrderStats {
    totalOrders: number
    pendingOrders: number
    paidOrders: number
    cancelledOrders: number
    totalRevenue: number
}

interface OrderData {
    orders: Order[]
    stats: OrderStats
}

export function OrderManagementAdmin() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [stats, setStats] = useState<OrderStats>({
        totalOrders: 0,
        pendingOrders: 0,
        paidOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted) {
            fetchOrders()
        }
    }, [mounted])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!mounted) return

        const interval = setInterval(() => {
            fetchOrders()
        }, 30000)

        return () => clearInterval(interval)
    }, [mounted])

    // Refresh on page visibility change and window focus
    useEffect(() => {
        if (!mounted) return

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchOrders()
            }
        }

        const handleFocus = () => {
            fetchOrders()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
        }
    }, [mounted])

    const fetchOrders = async () => {
        try {
            setLoading(true)
            setError(null)

            // Add cache-busting timestamp and no-cache headers
            const response = await fetch(`/api/admin/orders/?t=${Date.now()}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch orders')
            }

            const data: OrderData = await response.json()
            setOrders(data.orders)
            setStats(data.stats)
        } catch (error) {
            console.error('Failed to fetch orders:', error)
            setError('Gagal memuat data pesanan')
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.userEmail.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === "all" || order.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const handleViewOrder = (order: Order) => {
        router.push(`/admin/orders/${order.id}`)
    }

    const handleUpdateStatus = async (order: Order, newStatus: string) => {
        const oldStatus = order.status
        
        try {
            // Optimistic UI update - immediately update the local state
            setOrders(prevOrders =>
                prevOrders.map(o =>
                    o.id === order.id ? { ...o, status: newStatus } : o
                )
            )

            // Optimistic stats update
            setStats(prev => {
                const newStats = { ...prev }
                
                // Remove from old status
                if (oldStatus === 'pending') newStats.pendingOrders = Math.max(0, newStats.pendingOrders - 1)
                if (oldStatus === 'paid') newStats.paidOrders = Math.max(0, newStats.paidOrders - 1)
                if (oldStatus === 'cancelled') newStats.cancelledOrders = Math.max(0, newStats.cancelledOrders - 1)
                
                // Add to new status
                if (newStatus === 'pending') newStats.pendingOrders += 1
                if (newStatus === 'paid') {
                    newStats.paidOrders += 1
                    newStats.totalRevenue += order.total_amount
                }
                if (newStatus === 'cancelled') newStats.cancelledOrders += 1
                
                return newStats
            })

            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({
                    status: newStatus
                }),
            })

            if (!response.ok) {
                // Revert optimistic update on error
                setOrders(prevOrders =>
                    prevOrders.map(o =>
                        o.id === order.id ? { ...o, status: oldStatus } : o
                    )
                )
                setStats(prev => {
                    const revertedStats = { ...prev }
                    
                    // Revert old status
                    if (oldStatus === 'pending') revertedStats.pendingOrders += 1
                    if (oldStatus === 'paid') {
                        revertedStats.paidOrders += 1
                        revertedStats.totalRevenue += order.total_amount
                    }
                    if (oldStatus === 'cancelled') revertedStats.cancelledOrders += 1
                    
                    // Revert new status
                    if (newStatus === 'pending') revertedStats.pendingOrders = Math.max(0, revertedStats.pendingOrders - 1)
                    if (newStatus === 'paid') {
                        revertedStats.paidOrders = Math.max(0, revertedStats.paidOrders - 1)
                        revertedStats.totalRevenue = Math.max(0, revertedStats.totalRevenue - order.total_amount)
                    }
                    if (newStatus === 'cancelled') revertedStats.cancelledOrders = Math.max(0, revertedStats.cancelledOrders - 1)
                    
                    return revertedStats
                })
                throw new Error('Failed to update order status')
            }

            const result = await response.json()
            console.log('[ORDER MANAGEMENT] Update response:', result)

            // Update local state with the response data
            if (result.order) {
                setOrders(prevOrders =>
                    prevOrders.map(o =>
                        o.id === order.id ? { ...o, status: result.order.status } : o
                    )
                )
            }

            toast({
                title: "Status pesanan diubah",
                description: `Pesanan ${order.order_number} berhasil diubah menjadi ${getStatusLabel(newStatus)}.`,
            })

            // Refresh data after a short delay to ensure everything is in sync
            setTimeout(async () => {
                await fetchOrders()
            }, 300)
        } catch (error) {
            console.error('Failed to update order status:', error)
            toast({
                title: "Gagal mengubah status",
                description: "Terjadi kesalahan saat mengubah status pesanan.",
                variant: "destructive",
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800">Menunggu Pembayaran</Badge>
            case "paid":
                return <Badge className="bg-green-100 text-green-800">Dibayar</Badge>
            case "cancelled":
                return <Badge className="bg-red-100 text-red-800">Dibatalkan</Badge>
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
            case "paid":
                return <CheckCircle className="w-4 h-4 text-green-600" />
            case "cancelled":
                return <XCircle className="w-4 h-4 text-red-600" />
            case "completed":
                return <Package className="w-4 h-4 text-blue-600" />
            default:
                return <AlertCircle className="w-4 h-4 text-gray-600" />
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending":
                return "Menunggu Pembayaran"
            case "paid":
                return "Dibayar"
            case "cancelled":
                return "Dibatalkan"
            case "completed":
                return "Selesai"
            default:
                return status
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount)
    }

    if (!mounted) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {[...Array(5)].map((_, i) => (
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {[...Array(5)].map((_, i) => (
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
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Memuat data pesanan...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-destructive mb-4">{error}</p>
                        <Button onClick={fetchOrders}>Coba Lagi</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dibayar</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.paidOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dibatalkan</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Cari pesanan, pelanggan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending">Menunggu Pembayaran</SelectItem>
                        <SelectItem value="paid">Dibayar</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        <SelectItem value="completed">Selesai</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pesanan ({filteredOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{order.userName}</div>
                                                <div className="text-sm text-muted-foreground">{order.userEmail}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(order.status)}
                                                {getStatusBadge(order.status)}
                                                {order.payment_provider === 'manual' && order.payment_proof_url && order.status === 'pending' && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        <FileImage className="w-3 h-3 mr-1" />
                                                        Bukti Tersedia
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(order.created_at)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Lihat Detail
                                                    </DropdownMenuItem>
                                                    {order.status === "pending" && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(order, "paid")}>
                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                Tandai Dibayar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(order, "cancelled")}>
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Batalkan Pesanan
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {order.status === "paid" && (
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order, "completed")}>
                                                            <Package className="w-4 h-4 mr-2" />
                                                            Tandai Selesai
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <p className="text-muted-foreground">Tidak ada pesanan ditemukan</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
} 