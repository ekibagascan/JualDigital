"use client"

import { XCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PaymentFailedPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Failed Header */}
                    <div className="text-center mb-8">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold mb-2">Pembayaran Gagal</h1>
                        <p className="text-muted-foreground">
                            Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi.
                        </p>
                    </div>

                    {/* Error Details */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Mengapa Pembayaran Gagal?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                                    <div>
                                        <h3 className="font-medium">Saldo Tidak Cukup</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Pastikan saldo kartu kredit atau rekening bank Anda mencukupi.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                                    <div>
                                        <h3 className="font-medium">Kartu Diblokir</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Beberapa bank mungkin memblokir transaksi online. Hubungi bank Anda.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                                    <div>
                                        <h3 className="font-medium">Koneksi Internet</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Pastikan koneksi internet Anda stabil saat melakukan pembayaran.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <Button className="w-full" asChild>
                                        <a href="/checkout">
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Coba Lagi
                                        </a>
                                    </Button>
                                    <Button variant="outline" className="w-full" asChild>
                                        <a href="/cart">
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Kembali ke Keranjang
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Support Info */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <h3 className="font-medium mb-2">Butuh Bantuan?</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Tim support kami siap membantu Anda menyelesaikan pembayaran.
                                    </p>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href="/contact">Hubungi Support</a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
} 