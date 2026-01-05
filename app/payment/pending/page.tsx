"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Clock, AlertCircle, ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface Order {
    id: string
    order_number: string
    total_amount: number
    status: string
    payment_proof_url?: string
}

function PaymentPendingContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (orderId) {
            fetchOrder()
            // Poll for status updates every 10 seconds
            const interval = setInterval(fetchOrder, 10000)
            return () => clearInterval(interval)
        }
    }, [orderId])

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${orderId}`)
            const data = await res.json()
            if (data.order) {
                setOrder(data.order)
                // If order is paid, redirect to success page
                if (data.order.status === 'paid') {
                    router.push(`/payment/success?order_id=${orderId}`)
                }
            }
        } catch (error) {
            console.error("Error fetching order:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Memuat data pesanan...</p>
                    </div>
                </div>
                <Footer />
            </>
        )
    }

    if (!order) {
        return (
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center px-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                                <h2 className="text-xl font-semibold mb-2">Pesanan Tidak Ditemukan</h2>
                                <Button onClick={() => router.push("/")}>Kembali ke Beranda</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Header />
            <div className="min-h-screen flex items-center justify-center py-10 px-4">
                <div className="w-full max-w-2xl">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Menunggu Verifikasi Pembayaran
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Status Pesanan</h3>
                                <p className="text-lg">Order: {order.order_number}</p>
                                <p className="text-2xl font-bold mt-2">{formatCurrency(order.total_amount)}</p>
                            </div>

                            {order.payment_proof_url && (
                                <div>
                                    <h3 className="font-semibold mb-2">Bukti Pembayaran</h3>
                                    <div className="border rounded-lg p-4">
                                        <img
                                            src={order.payment_proof_url}
                                            alt="Payment proof"
                                            className="max-w-full h-auto rounded"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                                    <strong>Pembayaran Anda sedang diverifikasi oleh admin.</strong> Setelah pembayaran dikonfirmasi, produk digital akan dikirim ke email Anda. Proses verifikasi biasanya memakan waktu 1-24 jam.
                                </p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">
                                    Halaman ini akan otomatis memperbarui status pesanan Anda.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default function PaymentPendingPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Memuat...</p>
                    </div>
                </div>
                <Footer />
            </>
        }>
            <PaymentPendingContent />
        </Suspense>
    )
}

