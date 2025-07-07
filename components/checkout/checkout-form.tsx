"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Wallet, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/components/providers/cart-provider"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { orderService } from "@/lib/order-service"

const paymentMethods = [
  {
    id: "credit_card",
    name: "Kartu Kredit/Debit",
    icon: CreditCard,
    description: "Visa, Mastercard, JCB",
  },
  {
    id: "ewallet",
    name: "E-Wallet",
    icon: Wallet,
    description: "OVO, GoPay, DANA, LinkAja",
  },
  {
    id: "bank_transfer",
    name: "Transfer Bank",
    icon: Building,
    description: "BCA, Mandiri, BNI, BRI",
  },
  {
    id: "qris",
    name: "QRIS",
    icon: CreditCard,
    description: "Scan QRIS dengan aplikasi e-wallet atau mobile banking",
  },
]

export function CheckoutForm() {
  const [paymentMethod, setPaymentMethod] = useState("credit_card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const { items, getTotalPrice, clearCart, loading } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  const handleGuestInfoChange = (field: string, value: string) => {
    setGuestInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handlePayment = async () => {
    if (loading) {
      toast({
        title: "Memuat keranjang",
        description: "Mohon tunggu sebentar...",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Keranjang kosong",
        description: "Tidak ada produk untuk dibayar.",
        variant: "destructive",
      })
      return
    }

    // Validate guest information if user is not logged in
    if (!user) {
      if (!guestInfo.name || !guestInfo.email) {
        toast({
          title: "Data tidak lengkap",
          description: "Mohon lengkapi nama dan email untuk melanjutkan pembayaran.",
          variant: "destructive",
        })
        return
      }
    }

    setIsProcessing(true)

    try {
      const orderData = {
        user_id: user?.id,
        guest_name: !user ? guestInfo.name : undefined,
        guest_email: !user ? guestInfo.email : undefined,
        items: items.map((item) => ({
          product_id: item.product_id,
          seller_id: item.seller_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
        })),
        total_amount: getTotalPrice(),
        tax_amount: 0, // No tax for now
        payment_method: paymentMethod,
      }

      const { order, paymentUrl } = await orderService.createOrder(orderData)

      // Clear cart after successful order creation
      await clearCart()

      toast({
        title: "Pesanan berhasil dibuat!",
        description: "Anda akan diarahkan ke halaman pembayaran.",
      })

      // Redirect to payment URL
      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        router.push(`/payment/success?order_id=${order.id}`)
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Pembayaran gagal",
        description: "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Memuat keranjang...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Keranjang Kosong</h2>
        <p className="text-muted-foreground mb-8">Tidak ada produk untuk checkout</p>
        <Button asChild>
          <a href="/categories">Mulai Belanja</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Checkout Form */}
      <div className="space-y-6">
        {/* Guest Information */}
        {!user && (
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pembeli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={guestInfo.name}
                  onChange={(e) => handleGuestInfoChange("name", e.target.value)}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestInfo.email}
                  onChange={(e) => handleGuestInfoChange("email", e.target.value)}
                  placeholder="Masukkan email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Nomor Telepon (Opsional)</Label>
                <Input
                  id="phone"
                  value={guestInfo.phone}
                  onChange={(e) => handleGuestInfoChange("phone", e.target.value)}
                  placeholder="Masukkan nomor telepon"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-4">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <div key={method.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex items-center space-x-3 cursor-pointer">
                        <Icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Order Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Admin</span>
                <span>Gratis</span>
              </div>
              <div className="flex justify-between">
                <span>PPN</span>
                <span>Gratis</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? "Memproses..." : "Bayar Sekarang"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Dengan melanjutkan, Anda menyetujui{" "}
              <a href="/terms" className="text-primary hover:underline">
                Syarat & Ketentuan
              </a>{" "}
              dan{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Kebijakan Privasi
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

