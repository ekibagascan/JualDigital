"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
    ArrowLeft,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    User,
    Mail,
    Calendar,
    CreditCard
} from "lucide-react"

interface OrderItem {
    id: string
    product_id: string
    product_title: string
    product_image: string | null
    quantity: number
    price: number
    seller_earnings: number
}

interface Order {
    id: string
    order_number: string
    total_amount: number
    status: string
    created_at: string
    updated_at: string
    user_id: string
    userName: string
    userEmail: string
    items: OrderItem[]
}

interface AdminOrderDetailProps {
    orderId: string
}

export function AdminOrderDetail({ orderId }: AdminOrderDetailProps) {
    const router = useRouter()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted) {
            fetchOrder()
        }
    }, [mounted, orderId])

    const fetchOrder = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/admin/orders/${orderId}`)
            if (!response.ok) {
                throw new Error('Failed to fetch order')
            }

            const data = await response.json()
            setOrder(data.order)
        } catch (error) {
            console.error('Failed to fetch order:', error)
            setError('Gagal memuat data pesanan')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (newStatus: string) => {
        if (!order) return

        try {
            setUpdating(true)

            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to update order status')
            }

            toast({
                title: "Status pesanan diubah",
                description: `Pesanan berhasil diubah menjadi ${getStatusLabel(newStatus)}.`,
            })

            // Update local state
            setOrder(prev => prev ? { ...prev, status: newStatus } : null)
        } catch (error) {
            console.error('Failed to update order status:', error)
            toast({
                title: "Gagal mengubah status",
                description: "Terjadi kesalahan saat mengubah status pesanan.",
                variant: "destructive",
            })
        } finally {
            setUpdating(false)
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
            <div className="space-y-6">
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Memuat...</p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Memuat detail pesanan...</p>
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
                        <Button onClick={fetchOrder}>Coba Lagi</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!order) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-muted-foreground">Pesanan tidak ditemukan</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Button
                variant="outline"
                onClick={() => router.push('/admin/orders')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar Pesanan
            </Button>

            {/* Order Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">{order.order_number}</CardTitle>
                            <p className="text-muted-foreground">Order ID: {order.id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            {getStatusBadge(order.status)}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{order.userName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span>{order.userEmail}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{formatDate(order.created_at)}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Total: {formatCurrency(order.total_amount)}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Select value={order.status} onValueChange={handleUpdateStatus} disabled={updating}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Menunggu Pembayaran</SelectItem>
                                        <SelectItem value="paid">Dibayar</SelectItem>
                                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                        <SelectItem value="completed">Selesai</SelectItem>
                                    </SelectContent>
                                </Select>
                                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Pesanan</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>Harga</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead>Pendapatan Seller</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            {item.product_image ? (
                                                <img
                                                    src={item.product_image}
                                                    alt={item.product_title}
                                                    className="w-10 h-10 rounded object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.src = "/placeholder.svg"
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                                    <Package className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium">{item.product_title}</div>
                                                <div className="text-sm text-muted-foreground">ID: {item.product_id}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(item.price)}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                                    <TableCell>{formatCurrency(item.seller_earnings)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
} 