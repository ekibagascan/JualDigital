"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Clock, AlertCircle, Copy, Download, ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { PAYMENT_METHOD_DISPLAY } from "@/lib/xendit"
import { toast } from "@/hooks/use-toast"

interface PaymentData {
    id: string
    status: string
    amount: number
    currency: string
    payment_method: string
    qr_code_url?: string
    virtual_account_number?: string
    bank_code?: string
    invoice_url?: string
    transaction_id?: string
    created_at: string
}

interface OrderData {
    id: string
    order_number: string
    total_amount: number
    tax_amount: number
    status: string
    payment_method: string
    created_at: string
}

function PaymentProcessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const paymentId = searchParams.get("payment_id")

    const [order, setOrder] = useState<OrderData | null>(null)
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchPaymentData = async () => {
            if (!orderId || !paymentId) {
                router.push('/checkout')
                return
            }

            try {
                // Fetch order and payment data
                const [orderRes, paymentRes] = await Promise.all([
                    fetch(`/api/orders/${orderId}`),
                    fetch(`/api/payments/${paymentId}`)
                ])

                if (!orderRes.ok || !paymentRes.ok) {
                    throw new Error('Failed to fetch payment data')
                }

                const orderData = await orderRes.json()
                const paymentInfo = await paymentRes.json()

                setOrder(orderData)
                setPaymentData(paymentInfo)
            } catch (error) {
                console.error('Error fetching payment data:', error)
                toast({
                    title: "Error",
                    description: "Gagal memuat data pembayaran.",
                    variant: "destructive",
                })
                router.push('/checkout')
            } finally {
                setLoading(false)
            }
        }

        fetchPaymentData()
    }, [orderId, paymentId, router])

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            toast({
                title: "Berhasil",
                description: "Nomor rekening berhasil disalin ke clipboard.",
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menyalin ke clipboard.",
                variant: "destructive",
            })
        }
    }

    const getPaymentMethodInfo = (method: string) => {
        return PAYMENT_METHOD_DISPLAY[method as keyof typeof PAYMENT_METHOD_DISPLAY]
    }

    const renderPaymentInstructions = () => {
        if (!paymentData) return null

        const methodInfo = getPaymentMethodInfo(paymentData.payment_method)

        switch (paymentData.payment_method) {
            case 'QRIS':
                return (
                    <div className="text-center space-y-4">
                        <div className="bg-white p-6 rounded-lg border">
                            {paymentData.qr_code_url ? (
                                <img
                                    src={paymentData.qr_code_url}
                                    alt="QRIS QR Code"
                                    className="mx-auto max-w-64"
                                />
                            ) : (
                                <div className="w-64 h-64 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                                    <p className="text-gray-500">QR Code tidak tersedia</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold">Cara Pembayaran QRIS:</h3>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Buka aplikasi e-wallet atau mobile banking Anda</li>
                                <li>Pilih menu "Scan QRIS" atau "Pay QRIS"</li>
                                <li>Scan QR code di atas</li>
                                <li>Masukkan PIN atau konfirmasi pembayaran</li>
                                <li>Pembayaran selesai</li>
                            </ol>
                        </div>
                    </div>
                )

            case 'BJB':
            case 'BNI':
            case 'BRI':
            case 'BSI':
            case 'CIMB':
            case 'MANDIRI':
            case 'PERMATA':
                return (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Nomor Virtual Account</p>
                                    <p className="font-mono text-lg font-bold">{paymentData.virtual_account_number}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(paymentData.virtual_account_number || '')}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {copied ? 'Tersalin!' : 'Salin'}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold">Cara Pembayaran Virtual Account:</h3>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Buka aplikasi mobile banking atau internet banking</li>
                                <li>Pilih menu "Transfer" atau "Pembayaran"</li>
                                <li>Pilih "Virtual Account"</li>
                                <li>Masukkan nomor virtual account di atas</li>
                                <li>Konfirmasi jumlah pembayaran</li>
                                <li>Masukkan PIN atau konfirmasi pembayaran</li>
                            </ol>
                        </div>
                    </div>
                )

            case 'ALFAMART':
            case 'INDOMARET':
                return (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Kode Pembayaran</p>
                                    <p className="font-mono text-lg font-bold">{paymentData.transaction_id}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(paymentData.transaction_id || '')}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {copied ? 'Tersalin!' : 'Salin'}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold">Cara Pembayaran di Minimarket:</h3>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Kunjungi Alfamart atau Indomaret terdekat</li>
                                <li>Beritahu kasir ingin melakukan pembayaran</li>
                                <li>Berikan kode pembayaran di atas</li>
                                <li>Bayar sesuai jumlah yang tertera</li>
                                <li>Simpan struk pembayaran</li>
                            </ol>
                        </div>
                    </div>
                )

            case 'ASTRAPAY':
            case 'SHOPEEPAY':
                return (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Link Pembayaran</p>
                            <Button
                                className="w-full"
                                onClick={() => window.open(paymentData.invoice_url, '_blank')}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Buka Link Pembayaran
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold">Cara Pembayaran E-Wallet:</h3>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Klik tombol "Buka Link Pembayaran" di atas</li>
                                <li>Anda akan diarahkan ke halaman pembayaran</li>
                                <li>Pilih metode pembayaran e-wallet</li>
                                <li>Masukkan PIN atau konfirmasi pembayaran</li>
                                <li>Pembayaran selesai</li>
                            </ol>
                        </div>
                    </div>
                )

            default:
                return (
                    <div className="text-center p-8">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Metode Pembayaran Tidak Dikenal</h3>
                        <p className="text-muted-foreground">
                            Silakan hubungi customer service untuk bantuan.
                        </p>
                    </div>
                )
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center py-16">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Memuat data pembayaran...</p>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    if (!order || !paymentData) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center py-16">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-4">Data Pembayaran Tidak Ditemukan</h2>
                        <p className="text-muted-foreground mb-8">Silakan coba lagi atau hubungi customer service.</p>
                        <Button asChild>
                            <a href="/checkout">Kembali ke Checkout</a>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    const methodInfo = getPaymentMethodInfo(paymentData.payment_method)

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <span className="text-2xl">{methodInfo?.icon}</span>
                            <h1 className="text-3xl font-bold">{methodInfo?.name}</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Selesaikan pembayaran Anda untuk menyelesaikan pesanan
                        </p>
                    </div>

                    {/* Payment Status */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Clock className="w-5 h-5" />
                                <span>Status Pembayaran</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Order Number</p>
                                    <p className="font-medium">{order.order_number}</p>
                                </div>
                                <Badge variant="secondary">
                                    {paymentData.status === 'PENDING' ? 'Menunggu Pembayaran' : paymentData.status}
                                </Badge>
                            </div>
                            <Separator className="my-4" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                                    <p className="font-bold text-lg">{formatCurrency(paymentData.amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Metode</p>
                                    <p className="font-medium">{methodInfo?.name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Instruksi Pembayaran</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderPaymentInstructions()}
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="mt-6 space-y-4">
                        <Button
                            className="w-full"
                            onClick={() => window.location.reload()}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Cek Status Pembayaran
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                            <a href="/checkout">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Kembali ke Checkout
                            </a>
                        </Button>
                    </div>

                    {/* Help Section */}
                    <Card className="mt-6">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold">Butuh Bantuan?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Jika Anda mengalami kesulitan dalam pembayaran, silakan hubungi customer service kami.
                                </p>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="/contact">Hubungi Customer Service</a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default function PaymentProcessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentProcessContent />
        </Suspense>
    )
} 