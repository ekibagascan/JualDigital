"use client"

import { useState, useEffect } from "react"
import { Package, Eye, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import React from "react"

interface OrderItem {
    id: string
    product_title: string
    price: number
    quantity: number
    created_at: string
    seller_id: string
    products?: {
        title: string
        image_url?: string
    }
}

interface Order {
    id: string
    order_number: string
    user_id?: string
    guest_name?: string
    guest_email?: string
    total_amount: number
    status: string
    created_at: string
    note?: string
    order_items: OrderItem[]
    profiles?: {
        name?: string
        email?: string
    }
}

export function OrderManagement() {
    const { user } = useAuth()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [expandedNote, setExpandedNote] = useState<string | null>(null)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return

        const fetchOrders = async () => {
            setLoading(true)
            try {
                // Fetch orders for this seller's products
                const { data: orderItems, error } = await supabase
                    .from('order_items')
                    .select(`
            id,
            product_title,
            price,
            quantity,
            created_at,
            seller_id,
            products:product_id (
              title,
              image_url
            ),
            orders!inner (
              id,
              order_number,
              user_id,
              guest_name,
              guest_email,
              total_amount,
              status,
              created_at,
              note
            )
          `)
                    .eq('seller_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching orders:', error)
                    toast({
                        title: "Error",
                        description: "Gagal memuat data pesanan",
                        variant: "destructive",
                    })
                    return
                }

                // Group order items by order
                const orderMap = new Map<string, Order>()

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orderItems?.forEach((item: any) => {
                    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
                    const orderItem = {
                        id: item.id,
                        product_title: item.product_title,
                        price: item.price,
                        quantity: item.quantity,
                        created_at: item.created_at,
                        seller_id: item.seller_id,
                        products: item.products,
                    }

                    if (orderMap.has(order.id)) {
                        orderMap.get(order.id)!.order_items.push(orderItem)
                    } else {
                        orderMap.set(order.id, {
                            id: order.id,
                            order_number: order.order_number,
                            user_id: order.user_id,
                            guest_name: order.guest_name,
                            guest_email: order.guest_email,
                            total_amount: order.total_amount,
                            status: order.status,
                            created_at: order.created_at,
                            note: order.note,
                            profiles: order.profiles,
                            order_items: [orderItem],
                        })
                    }
                })

                // Fetch user profiles for orders that have user_id
                const userIds = Array.from(orderMap.values())
                    .filter(order => order.user_id)
                    .map(order => order.user_id!)
                    .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates



                let userProfiles: { [key: string]: { name?: string; email?: string } } = {}

                if (userIds.length > 0) {
                    // Fetch profiles (names)
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, name')
                        .in('id', userIds)



                    // Fetch emails from auth.users using service role
                    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()



                    if (profilesError) {
                        console.error('Error fetching user profiles:', profilesError)
                    } else {
                        userProfiles = (profilesData || []).reduce((acc, profile) => {
                            // Find corresponding user data for email
                            const userData = usersData?.users?.find(user => user.id === profile.id)
                            acc[profile.id] = {
                                name: profile.name,
                                email: userData?.email
                            }
                            return acc
                        }, {} as { [key: string]: { name?: string; email?: string } })


                    }
                }

                // Merge user profiles with orders
                const ordersWithProfiles = Array.from(orderMap.values()).map(order => {
                    const profile = order.user_id ? userProfiles[order.user_id] : undefined

                    return {
                        ...order,
                        profiles: profile
                    }
                })



                setOrders(ordersWithProfiles)
            } catch (error) {
                console.error('Error fetching orders:', error)
                toast({
                    title: "Error",
                    description: "Gagal memuat data pesanan",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, [user])

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.order_items.some(item =>
                item.product_title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        const matchesStatus = statusFilter === "all" || order.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid":
                return <Badge className="bg-green-100 text-green-800">Dibayar</Badge>
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800">Menunggu Pembayaran</Badge>
            case "failed":
                return <Badge className="bg-red-100 text-red-800">Gagal</Badge>
            case "expired":
                return <Badge className="bg-gray-100 text-gray-800">Kadaluarsa</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "paid":
                return <CheckCircle className="w-4 h-4 text-green-600" />
            case "pending":
                return <Clock className="w-4 h-4 text-yellow-600" />
            case "failed":
                return <XCircle className="w-4 h-4 text-red-600" />
            default:
                return <Package className="w-4 h-4 text-gray-600" />
        }
    }

    const truncateNote = (note: string, maxWords: number = 5) => {
        if (!note) return 'Tidak ada catatan'
        const words = note.split(' ')
        if (words.length <= maxWords) return note
        return words.slice(0, maxWords).join(' ') + '...'
    }

    if (!user) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
                <p className="text-muted-foreground">Silakan login untuk mengakses halaman ini</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Kelola Pesanan</h1>
                    <p className="text-muted-foreground">Lihat dan kelola pesanan produk Anda</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orders.length}</div>
                        <p className="text-xs text-muted-foreground">Semua pesanan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pesanan Dibayar</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {orders.filter(o => o.status === 'paid').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Pesanan selesai</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {orders.filter(o => o.status === 'pending').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Pesanan pending</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_amount, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Dari pesanan dibayar</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Cari pesanan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="paid">Dibayar</SelectItem>
                                <SelectItem value="pending">Menunggu Pembayaran</SelectItem>
                                <SelectItem value="failed">Gagal</SelectItem>
                                <SelectItem value="expired">Kadaluarsa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pesanan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[120px]">Order ID</TableHead>
                                    <TableHead className="min-w-[140px]">Pembeli</TableHead>
                                    <TableHead className="min-w-[200px]">Produk</TableHead>
                                    <TableHead className="min-w-[100px]">Total</TableHead>
                                    <TableHead className="min-w-[140px]">Status</TableHead>
                                    <TableHead className="min-w-[100px] hidden md:table-cell">Tanggal</TableHead>
                                    <TableHead className="min-w-[120px] hidden lg:table-cell">Catatan</TableHead>
                                    <TableHead className="min-w-[80px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                Loading...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <React.Fragment key={order.id}>
                                            <TableRow>
                                                <TableCell className="font-medium">
                                                    <div className="text-sm">{order.order_number}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="whitespace-nowrap">
                                                        <div className="font-medium text-sm">
                                                            {order.profiles?.name || order.guest_name || 'Customer'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground hidden sm:block">
                                                            {order.profiles?.email || order.guest_email}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {order.order_items.map((item) => (
                                                            <div key={item.id} className="flex items-center gap-2">
                                                                {item.products?.image_url && (
                                                                    <img
                                                                        src={item.products.image_url}
                                                                        alt={item.product_title}
                                                                        className="w-6 h-6 object-cover rounded"
                                                                    />
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-sm font-medium truncate">{item.product_title}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Qty: {item.quantity} × {formatCurrency(item.price)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm">{formatCurrency(order.total_amount)}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                                        {getStatusIcon(order.status)}
                                                        <span className="text-xs">{getStatusBadge(order.status)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="text-xs">
                                                        {new Date(order.created_at).toLocaleDateString("id-ID")}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div
                                                        className="text-xs max-w-[120px] cursor-pointer hover:bg-gray-50 p-1 rounded truncate"
                                                        onClick={() => setExpandedNote(expandedNote === order.id ? null : order.id)}
                                                        title="Click to view full note"
                                                    >
                                                        {expandedNote === order.id
                                                            ? (order.note || 'Tidak ada catatan')
                                                            : truncateNote(order.note || '')
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {expandedOrder === order.id && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="bg-gray-50">
                                                        <div className="p-4 space-y-4">
                                                            <h4 className="font-semibold text-lg">Detail Pesanan: {order.order_number}</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <h5 className="font-medium mb-2">Informasi Pembeli</h5>
                                                                    <div className="space-y-1 text-sm">
                                                                        <p><span className="font-medium">Nama:</span> {order.profiles?.name || order.guest_name || 'Customer'}</p>
                                                                        <p><span className="font-medium">Status:</span> {order.status}</p>
                                                                        <p><span className="font-medium">Tanggal:</span> {new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-medium mb-2">Detail Produk</h5>
                                                                    <div className="space-y-2">
                                                                        {order.order_items.map((item) => (
                                                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded border">
                                                                                {item.products?.image_url && (
                                                                                    <img
                                                                                        src={item.products.image_url}
                                                                                        alt={item.product_title}
                                                                                        className="w-12 h-12 object-cover rounded"
                                                                                    />
                                                                                )}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-medium truncate">{item.product_title}</p>
                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        Qty: {item.quantity} × {formatCurrency(item.price)}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {order.note && (
                                                                <div>
                                                                    <h5 className="font-medium mb-2">Catatan</h5>
                                                                    <p className="text-sm bg-white p-3 rounded border">{order.note}</p>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pt-4 border-t">
                                                                <div>
                                                                    <p className="text-lg font-bold">Total: {formatCurrency(order.total_amount)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusIcon(order.status)}
                                                                    {getStatusBadge(order.status)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!loading && filteredOrders.length === 0 && (
                        <div className="text-center py-16">
                            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Tidak ada pesanan ditemukan</h3>
                            <p className="text-muted-foreground">
                                {searchQuery || statusFilter !== "all"
                                    ? "Coba ubah filter pencarian Anda"
                                    : "Pesanan pertama Anda akan muncul di sini"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
} 