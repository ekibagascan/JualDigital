"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Download, Mail } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { orderService } from "@/lib/order-service"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams()
    const orderId = searchParams.get("order_id")
    const paymentId = searchParams.get("payment_id")
    const [order, setOrder] = useState<any>(null)
    const [orderItems, setOrderItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            if (orderId) {
                try {
                    const orderData = await orderService.getOrder(orderId)
                    const items = await orderService.getOrderItems(orderId)

                    setOrder(orderData)
                    setOrderItems(items)
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

    const handleDownload = async (productId: string) => {
        try {
            // Here you would implement the actual download logic
            // For now, we'll just show a success message
            toast({
                title: "Download dimulai",
                description: "File sedang diunduh...",
            })
        } catch (error) {
            toast({
                title: "Download gagal",
                description: "Terjadi kesalahan saat mengunduh file.",
                variant: "destructive",
            })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Memuat data pesanan...</p>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold mb-2">Pembayaran Berhasil!</h1>
                        <p className="text-muted-foreground">
                            Terima kasih atas pembelian Anda. Produk digital siap diunduh.
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
                                        <p className="font-medium text-green-600">Paid</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Amount</p>
                                        <p className="font-medium">{formatCurrency(order.total_amount + order.tax_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Payment Method</p>
                                        <p className="font-medium capitalize">{order.payment_method.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Products to Download */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Produk Digital</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Klik tombol download untuk mengunduh produk yang telah dibeli
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {orderItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            {item.image_url && (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-medium">{item.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatCurrency(item.price)} x {item.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleDownload(item.product_id)}
                                            className="flex items-center space-x-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Download</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Info */}
                    <div className="mt-6 space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start space-x-3">
                                    <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <h3 className="font-medium mb-1">Email Konfirmasi</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Email konfirmasi telah dikirim ke {order?.guest_email || 'email Anda'}.
                                            Link download juga tersedia di email tersebut.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="text-center space-y-4">
                            <Button asChild>
                                <a href="/dashboard">Lihat Pesanan Saya</a>
                            </Button>
                            <Button variant="outline" asChild>
                                <a href="/categories">Lanjut Belanja</a>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
} 