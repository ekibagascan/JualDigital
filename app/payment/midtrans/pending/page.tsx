"use client"

import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import Link from "next/link"

export default function MidtransPendingPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-yellow-500" />
              Pembayaran Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Pembayaran Anda sedang menunggu konfirmasi. Kami akan mengirimkan email konfirmasi setelah pembayaran dikonfirmasi.
            </p>
            {orderId && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Order ID:</strong> {orderId}
                </p>
              </div>
            )}
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/orders">Lihat Pesanan</Link>
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
