"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { XCircle, AlertCircle } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { OrderService } from "@/lib/order-service"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Order {
    id: string
    order_number: string
    total_amount: number
    tax_amount: number
    payment_method?: string
    invoice_url?: string
}

function PaymentFailedContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            if (orderId) {
                try {
                    const supabase = createClientComponentClient()
                    const orderService = new OrderService(supabase)
                    const orderData = await orderService.getOrder(orderId)
                    setOrder(orderData)
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

    const handleRetryPayment = () => {
        if (order?.invoice_url) {
            window.location.href = order.invoice_url
        } else {
            router.push('/cart')
        }
    }

    if (loading) {
        return (
            <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Memuat...</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Failed Header */}
            <div className="text-center mb-8">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2">Pembayaran Gagal</h1>
                <p className="text-muted-foreground">
                    Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi.
                </p>
            </div>

            {/* Order Details */}
            {order && (
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
                                <p className="font-medium text-red-600">Failed</p>
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
            )}

            {/* Help Information */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Mengapa Pembayaran Gagal?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Saldo Tidak Cukup</h4>
                                <p className="text-sm text-muted-foreground">
                                    Pastikan saldo e-wallet atau rekening Anda mencukupi.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Koneksi Internet</h4>
                                <p className="text-sm text-muted-foreground">
                                    Pastikan koneksi internet Anda stabil saat melakukan pembayaran.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Waktu Pembayaran</h4>
                                <p className="text-sm text-muted-foreground">
                                    Pembayaran mungkin gagal jika melebihi batas waktu yang ditentukan.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button onClick={handleRetryPayment}>
                    Coba Lagi
                </Button>
                <Button onClick={() => router.push('/cart')} variant="outline">
                    Kembali ke Keranjang
                </Button>
                <Button onClick={() => router.push('/dashboard')} variant="outline">
                    Dashboard
                </Button>
            </div>
        </div>
    )
}

export default function PaymentFailedPage() {
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
                    <PaymentFailedContent />
                </Suspense>
            </main>
            <Footer />
        </div>
    )
} 