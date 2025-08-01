"use client"

import { useState } from "react"
import { Clock, Mail, MapPin, Phone, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export function ComingSoon() {
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email.trim()) {
            toast({
                title: "Email diperlukan",
                description: "Silakan masukkan email Anda.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/email-subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim() }),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Berhasil!",
                    description: "Email Anda telah didaftarkan. Kami akan mengirimkan notifikasi saat platform siap diluncurkan.",
                })
                setEmail("")
            } else {
                toast({
                    title: "Gagal mendaftar",
                    description: data.error || "Terjadi kesalahan saat mendaftar email.",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error('Email subscribe error:', error)
            toast({
                title: "Gagal mendaftar",
                description: "Terjadi kesalahan saat mendaftar email.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
                <div className="container mx-auto px-4 py-24">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Logo/Brand */}
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-32 h-32 md:w-40 md:h-40 bg-black rounded-3xl shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300">
                                <h1 className="text-4xl md:text-6xl font-bold text-white">
                                    JD
                                </h1>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                                Jual Digital
                            </h2>
                            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
                                Marketplace Produk Digital Indonesia
                            </p>
                        </div>

                        {/* Coming Soon Badge */}
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full mb-8">
                            <Clock className="w-5 h-5" />
                            <span className="font-semibold">Segera Hadir</span>
                        </div>

                        {/* Main Message */}
                        <div className="mb-12">
                            <h3 className="text-2xl md:text-4xl font-bold text-foreground mb-6">
                                Platform Jual Beli Produk Digital Terpercaya
                            </h3>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                Temukan dan jual ebook, template design, software, musik, dan produk digital lainnya
                                dengan aman dan terpercaya. Platform marketplace digital terbaik di Indonesia.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent className="p-6 text-center">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Globe className="w-6 h-6 text-primary" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Produk Digital</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Ebook, template, software, dan produk digital berkualitas
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent className="p-6 text-center">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MapPin className="w-6 h-6 text-primary" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Marketplace Terpercaya</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Transaksi aman dengan sistem escrow dan garansi
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent className="p-6 text-center">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Phone className="w-6 h-6 text-primary" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Dukungan 24/7</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Customer service siap membantu kapan saja
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Email Signup */}
                        <div className="max-w-md mx-auto relative z-10">
                            <h4 className="text-lg font-semibold mb-4">Dapatkan Notifikasi Peluncuran</h4>


                            <form onSubmit={handleEmailSubmit} className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="Masukkan email Anda"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                    style={{ position: 'relative', zIndex: 20 }}
                                />
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{ position: 'relative', zIndex: 20 }}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    {isSubmitting ? "Mendaftar..." : "Daftar"}
                                </Button>
                            </form>
                            <p className="text-xs text-muted-foreground mt-2">
                                Kami akan mengirimkan notifikasi saat platform siap diluncurkan
                            </p>
                        </div>
                    </div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>
            </section>

            {/* Info Section */}
            <section className="py-16 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="text-2xl md:text-3xl font-bold mb-8">
                            Mengapa Memilih Jual Digital?
                        </h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="text-left">
                                <h4 className="font-semibold text-lg mb-3">Untuk Pembeli</h4>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li>• Produk digital berkualitas tinggi</li>
                                    <li>• Harga terjangkau dan kompetitif</li>
                                    <li>• Sistem escrow yang aman</li>
                                    <li>• Download instan setelah pembayaran</li>
                                    <li>• Garansi dan dukungan pelanggan</li>
                                </ul>
                            </div>
                            <div className="text-left">
                                <h4 className="font-semibold text-lg mb-3">Untuk Penjual</h4>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li>• Platform marketplace yang terpercaya</li>
                                    <li>• Komisi rendah dan transparan</li>
                                    <li>• Tools manajemen produk yang mudah</li>
                                    <li>• Pembayaran cepat dan aman</li>
                                    <li>• Dukungan marketing dan promosi</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}

        </>
    )
}