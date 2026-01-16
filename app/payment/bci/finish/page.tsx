"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react"
import Link from "next/link"

export default function BCIFinishPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("paymentId")
  const orderId = searchParams.get("orderId")
  const status = searchParams.get("status")
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null)

  useEffect(() => {
    if (status) {
      if (status === 'completed') {
        setPaymentStatus('success')
      } else if (status === 'pending') {
        setPaymentStatus('pending')
      } else if (status === 'failed' || status === 'expired') {
        setPaymentStatus('failed')
      }
      setLoading(false)
    } else if (paymentId) {
      // Check payment status from API
      const checkStatus = async () => {
        try {
          const res = await fetch(`/api/payments/bci/status?paymentId=${paymentId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status === 'completed') {
              setPaymentStatus('success')
            } else if (data.status === 'pending') {
              setPaymentStatus('pending')
            } else {
              setPaymentStatus('failed')
            }
          }
        } catch (error) {
          console.error("Error checking payment status:", error)
        } finally {
          setLoading(false)
        }
      }
      checkStatus()
    } else {
      setLoading(false)
    }
  }, [paymentId, status])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Memverifikasi pembayaran...</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const getStatusContent = () => {
    if (paymentStatus === 'success') {
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: "Pembayaran Berhasil!",
        message: "Terima kasih! Pembayaran crypto Anda telah dikonfirmasi. Email konfirmasi dan link download telah dikirim ke email Anda.",
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800"
      }
    } else if (paymentStatus === 'pending') {
      return {
        icon: <Clock className="h-6 w-6 text-yellow-500" />,
        title: "Pembayaran Pending",
        message: "Pembayaran crypto Anda sedang menunggu konfirmasi blockchain. Kami akan mengirimkan email konfirmasi setelah pembayaran dikonfirmasi.",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        borderColor: "border-yellow-200 dark:border-yellow-800"
      }
    } else {
      return {
        icon: <XCircle className="h-6 w-6 text-red-500" />,
        title: "Pembayaran Gagal",
        message: "Maaf, pembayaran crypto Anda gagal atau dibatalkan. Silakan coba lagi.",
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800"
      }
    }
  }

  const statusContent = getStatusContent()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusContent.icon}
              {statusContent.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border ${statusContent.bgColor} ${statusContent.borderColor}`}>
              <p className="text-sm">
                {statusContent.message}
              </p>
            </div>
            {orderId && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Order ID:</strong> {orderId}
                </p>
                {paymentId && (
                  <p className="text-sm mt-1">
                    <strong>Payment ID:</strong> {paymentId}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/purchases">Lihat Pesanan</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
