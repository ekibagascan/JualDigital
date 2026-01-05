"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Upload, Copy, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface Order {
    id: string
    order_number: string
    total_amount: number
    tax_amount: number
    status: string
}

function PaymentInstructionsContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get("order_id")
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [transferAmount, setTransferAmount] = useState("")
    const [transferNote, setTransferNote] = useState("")
    const [copied, setCopied] = useState(false)

    // Bank account details - UPDATE THESE WITH YOUR ACTUAL BANK INFO
    const bankAccount = {
        bank: process.env.NEXT_PUBLIC_BANK_NAME || "Bank BCA",
        accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "1234567890",
        accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "PT Jual Digital",
    }

    useEffect(() => {
        if (orderId) {
            fetchOrder()
        }
    }, [orderId])

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${orderId}`)
            const data = await res.json()
            if (data.order) {
                setOrder(data.order)
                setTransferAmount(data.order.total_amount.toString())
            }
        } catch (error) {
            console.error("Error fetching order:", error)
            toast({
                title: "Error",
                description: "Gagal memuat data pesanan",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const copyAccountNumber = () => {
        navigator.clipboard.writeText(bankAccount.accountNumber)
        setCopied(true)
        toast({
            title: "Berhasil",
            description: "Nomor rekening disalin ke clipboard",
        })
        setTimeout(() => setCopied(false), 2000)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "Error",
                    description: "Ukuran file maksimal 5MB",
                    variant: "destructive",
                })
                return
            }
            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Error",
                    description: "Hanya file gambar yang diperbolehkan",
                    variant: "destructive",
                })
                return
            }
            setProofFile(file)
        }
    }

    const handleSubmitProof = async () => {
        if (!proofFile || !transferAmount) {
            toast({
                title: "Error",
                description: "Harap lengkapi semua field yang wajib",
                variant: "destructive",
            })
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("orderId", orderId!)
            formData.append("proof", proofFile)
            formData.append("transferAmount", transferAmount)
            formData.append("transferDate", new Date().toISOString().split("T")[0])
            formData.append("transferNote", transferNote)

            const res = await fetch("/api/payments/upload-proof", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()

            if (res.ok) {
                toast({
                    title: "Berhasil",
                    description: "Bukti pembayaran berhasil diupload. Admin akan memverifikasi pembayaran Anda.",
                })
                setTimeout(() => {
                    router.push(`/payment/pending?order_id=${orderId}`)
                }, 2000)
            } else {
                throw new Error(data.error || "Upload failed")
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal upload bukti pembayaran",
                variant: "destructive",
            })
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <div className="container py-10 flex items-center justify-center min-h-[60vh]">
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
                <div className="container py-10">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                                <h2 className="text-xl font-semibold mb-2">Pesanan Tidak Ditemukan</h2>
                                <p className="text-muted-foreground mb-4">
                                    Pesanan yang Anda cari tidak ditemukan atau sudah tidak valid.
                                </p>
                                <Button onClick={() => router.push("/")}>Kembali ke Beranda</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </>
        )
    }

    const totalAmount = order.total_amount + (order.tax_amount || 0)

    return (
        <>
            <Header />
            <div className="min-h-screen flex items-center justify-center py-10 px-4">
                <div className="w-full max-w-2xl">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>Instruksi Pembayaran</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                                    <strong>Catatan:</strong> Karena masalah teknis untuk sementara pembayaran menggunakan metode manual 🙏🏻.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Total Pembayaran</h3>
                                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                                <p className="text-sm text-muted-foreground mt-1">Order: {order.order_number}</p>
                            </div>

                            <div className="border rounded-lg p-4 bg-muted">
                                <h3 className="font-semibold mb-3">Transfer ke Rekening Bank</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Bank:</span>
                                        <span className="font-semibold">{bankAccount.bank}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>No. Rekening:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold font-mono">{bankAccount.accountNumber}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={copyAccountNumber}
                                                className="h-8 w-8 p-0"
                                            >
                                                {copied ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nama:</span>
                                        <span className="font-semibold">{bankAccount.accountName}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold">Upload Bukti Pembayaran</h3>

                                <div>
                                    <Label htmlFor="amount">Jumlah Transfer *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        placeholder="Masukkan jumlah transfer"
                                        className="mt-1"
                                    />
                                </div>


                                <div>
                                    <Label htmlFor="note">Catatan (Opsional)</Label>
                                    <Textarea
                                        id="note"
                                        value={transferNote}
                                        onChange={(e) => setTransferNote(e.target.value)}
                                        placeholder="Tambahkan catatan jika perlu (contoh: nomor pesanan)"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="proof">Bukti Transfer (Screenshot/Photo) *</Label>
                                    <Input
                                        id="proof"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="mt-1"
                                    />
                                    {proofFile && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            File: {proofFile.name} ({(proofFile.size / 1024).toFixed(2)} KB)
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Format: JPG, PNG, atau GIF. Maksimal 5MB
                                    </p>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleSubmitProof}
                                    disabled={uploading || !proofFile || !transferAmount}
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Mengupload...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Kirim Bukti Pembayaran
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <strong>Catatan Penting:</strong> Setelah admin memverifikasi pembayaran Anda, produk digital akan dikirim ke email Anda. Proses verifikasi biasanya memakan waktu 1-24 jam.
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

export default function PaymentInstructionsPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <div className="container py-10 flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Memuat...</p>
                    </div>
                </div>
                <Footer />
            </>
        }>
            <PaymentInstructionsContent />
        </Suspense>
    )
}

