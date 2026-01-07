"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function DokuPaymentContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (orderId) {
            redirectToDokuCheckout()
        } else {
            setError("Order ID tidak ditemukan")
            setLoading(false)
        }
    }, [orderId])

    const redirectToDokuCheckout = async () => {
        try {
            // Get checkout URL from order or create new one
            const res = await fetch(`/api/orders/${orderId}`)
            const orderData = await res.json()

            if (orderData.order?.invoice_url && orderData.order.invoice_url.includes('checkout.doku.com')) {
                // Order already has checkout URL, redirect immediately
                window.location.href = orderData.order.invoice_url
                return
            }

            // Create new checkout session
            const createRes = await fetch('/api/payments/doku/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: orderId,
                }),
            })

            const createData = await createRes.json()

            if (!createRes.ok) {
                throw new Error(createData.error || 'Failed to create checkout session')
            }

            if (createData.checkoutUrl) {
                // Redirect to DOKU Checkout
                window.location.href = createData.checkoutUrl
            } else {
                throw new Error('Checkout URL not received')
            }
        } catch (err) {
            console.error("Error redirecting to DOKU Checkout:", err)
            setError(err instanceof Error ? err.message : "Gagal memuat halaman pembayaran")
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Mengarahkan ke halaman pembayaran DOKU...</p>
                    </div>
                </div>
                <Footer />
            </>
        )
    }

    if (error) {
        return (
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center px-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <h2 className="text-xl font-semibold mb-2">Error</h2>
                                <p className="text-muted-foreground mb-4">{error}</p>
                                <div className="flex gap-2 justify-center">
                                    <Button onClick={() => router.push("/")}>Kembali ke Beranda</Button>
                                    <Button variant="outline" onClick={() => redirectToDokuCheckout()}>
                                        Coba Lagi
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </>
        )
    }

    return null
}

export default function DokuPaymentPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Memuat...</p>
                    </div>
                </div>
                <Footer />
            </>
        }>
            <DokuPaymentContent />
        </Suspense>
    )
}

