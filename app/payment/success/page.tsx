"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Download, AlertCircle } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Order {
    id: string
    order_number: string
    total_amount: number
    tax_amount: number
    payment_method?: string
    status: string
    invoice_url?: string
}

interface OrderItem {
    id: string
    product_id: string
    product_title: string
    quantity: number
    price: number
}

function PaymentSuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const [order, setOrder] = useState<Order | null>(null)
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            if (orderId) {
                try {
                    console.log('[SUCCESS PAGE] Fetching order:', orderId)

                    const response = await fetch(`/api/orders/${orderId}`)
                    const data = await response.json()

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch order')
                    }

                    console.log('[SUCCESS PAGE] Order data received:', data.order?.id, 'Status:', data.order?.status)

                    setOrder(data.order)
                    setOrderItems(data.items || [])

                    // If order is still pending, start polling for status updates
                    if (data.order && data.order.status === 'pending') {
                        pollOrderStatus(orderId)
                    }
                } catch (error) {
                    console.error('Error fetching order:', error)
                    toast({
                        title: "Error",
                        description: "Gagal memuat data pesanan.",
                        variant: "destructive",
                    })
                } finally {
                    setLoading(false)
                }
            } else {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    const pollOrderStatus = async (orderId: string) => {
        const maxAttempts = 30 // 5 minutes with 10-second intervals
        let attempts = 0

        const poll = async () => {
            try {
                const response = await fetch(`/api/orders/${orderId}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch order')
                }

                if (data.order && data.order.status === 'paid') {
                    setOrder(data.order)
                    setOrderItems(data.items || [])
                    toast({
                        title: "Pembayaran Berhasil!",
                        description: "Status pesanan telah diperbarui.",
                    })
                    return
                }

                attempts++
                if (attempts < maxAttempts) {
                    setTimeout(poll, 10000) // Poll every 10 seconds
                } else {
                    toast({
                        title: "Menunggu Pembayaran",
                        description: "Pembayaran sedang diproses. Silakan cek kembali dalam beberapa menit.",
                    })
                }
            } catch (error) {
                console.error('Error polling order status:', error)
            }
        }

        poll()
    }

    const handleDownload = async (orderItemId: string, productTitle: string) => {
        try {
            const res = await fetch(`/api/download/${orderItemId}`)
            if (res.redirected) {
                window.open(res.url, '_blank')
                toast({
                    title: "Download dimulai",
                    description: `Mengunduh ${productTitle}...`,
                })
            } else {
                const data = await res.json()
                toast({
                    title: "Download gagal",
                    description: data.error || "Terjadi kesalahan saat mengunduh file.",
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: "Download gagal",
                description: "Terjadi kesalahan saat mengunduh file.",
                variant: "destructive",
            })
        }
    }

    if (loading) {
        return (
            <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Memuat data pesanan...</p>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2">Pesanan Tidak Ditemukan</h1>
                <p className="text-muted-foreground mb-8">
                    Pesanan yang Anda cari tidak ditemukan atau telah dihapus.
                </p>
                <Button onClick={() => router.push('/dashboard')}>
                    Kembali ke Dashboard
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
                {order.status === 'paid' ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold mb-2">Pembayaran Berhasil!</h1>
                        <p className="text-muted-foreground">
                            Terima kasih atas pembelian Anda. Produk digital siap diunduh.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                        <h1 className="text-3xl font-bold mb-2">Menunggu Pembayaran</h1>
                        <p className="text-muted-foreground">
                            Pembayaran sedang diproses. Halaman ini akan diperbarui otomatis.
                        </p>
                    </>
                )}
            </div>

            {/* Order Details */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Detail Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Order Number</p>
                            <p className="font-medium">{order.order_number}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className={`font-medium ${order.status === 'paid' ? 'text-green-600' :
                                order.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                {order.status === 'paid' ? 'Paid' :
                                    order.status === 'pending' ? 'Pending' : 'Failed'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="font-medium">{formatCurrency(order.total_amount + order.tax_amount)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Payment Method</p>
                            <p className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products to Download - Only show if order is paid */}
            {order.status === 'paid' && orderItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Produk Digital</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {orderItems.map((item: OrderItem) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <h3 className="font-medium">{item.product_title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Quantity: {item.quantity}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownload(item.id, item.product_title)}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8">
                <Button onClick={() => router.push('/dashboard')}>
                    Kembali ke Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                    Lanjut Belanja
                </Button>
            </div>
        </div>
    )
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <Suspense fallback={
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Memuat...</p>
                    </div>
                }>
                    <PaymentSuccessContent />
                </Suspense>
            </main>
            <Footer />
        </div>
    )
} 