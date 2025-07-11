"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Wallet, Building, QrCode, Store, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useCart } from "@/components/providers/cart-provider"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { PAYMENT_METHODS, PAYMENT_METHOD_DISPLAY } from "@/lib/xendit"

// Payment method categories with icons
const paymentCategories = [
  {
    id: "qris",
    name: "QRIS",
    icon: QrCode,
    description: "Scan QRIS dengan aplikasi e-wallet atau mobile banking",
    methods: [PAYMENT_METHODS.QRIS],
    isSingle: true,
  },
  {
    id: "ewallet",
    name: "E-Wallet",
    icon: Wallet,
    description: "Pembayaran melalui e-wallet",
    methods: [PAYMENT_METHODS.E_WALLET.ASTRAPAY, PAYMENT_METHODS.E_WALLET.SHOPEEPAY],
  },
  {
    id: "virtual_account",
    name: "Virtual Account",
    icon: Building,
    description: "Transfer melalui virtual account bank",
    methods: [
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.BJB,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.BNI,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.BRI,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.BSI,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.CIMB,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.MANDIRI,
      PAYMENT_METHODS.VIRTUAL_ACCOUNT.PERMATA,
    ],
  },
  {
    id: "retail_outlet",
    name: "Retail Outlet",
    icon: Store,
    description: "Bayar di minimarket terdekat",
    methods: [
      PAYMENT_METHODS.RETAIL_OUTLET.ALFAMART,
      PAYMENT_METHODS.RETAIL_OUTLET.INDOMARET,
      PAYMENT_METHODS.RETAIL_OUTLET.AKULAKU,
    ],
  },
]

export function CheckoutForm() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("QRIS") // Set QRIS as default for testing
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })

  // Check if selected payment method requires phone number
  const phoneRequiredMethods = ['ASTRAPAY', 'SHOPEEPAY']
  const requiresPhone = phoneRequiredMethods.includes(selectedPaymentMethod)

  const { items, getTotalPrice, clearCart, loading } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  // Debug log: print user object
  console.log('[DEBUG] user object:', user);
  console.log('[DEBUG] user?.user_metadata:', user?.user_metadata);
  console.log('[DEBUG] user?.email:', user?.email);
  console.log('[DEBUG] Is user logged in?', !!user);
  console.log('[DEBUG] User ID:', user?.id);
  console.log('[DEBUG] User email confirmed?', user?.email_confirmed_at);
  console.log('[DEBUG] User app_metadata:', user?.app_metadata);

  const handleGuestInfoChange = (field: string, value: string) => {
    setGuestInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method)
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

    if (!selectedPaymentMethod) {
      toast({
        title: "Metode pembayaran belum dipilih",
        description: "Silakan pilih metode pembayaran terlebih dahulu.",
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

    // Validate phone number for payment methods that require it
    if (requiresPhone && !guestInfo.phone) {
      toast({
        title: "Nomor telepon diperlukan",
        description: "Mohon masukkan nomor telepon untuk metode pembayaran ini.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Get user name from various sources
      const getUserName = () => {
        if (user?.user_metadata?.name) return user.user_metadata.name
        if (user?.user_metadata?.full_name) return user.user_metadata.full_name
        if (user?.app_metadata?.provider === 'google' && user?.user_metadata?.full_name) return user.user_metadata.full_name
        return user?.email || 'User'
      }

      const orderData = {
        user_id: user?.id,
        user_name: getUserName(),
        user_email: user?.email,
        user_phone: user ? guestInfo.phone : undefined, // Include phone for logged-in users
        guest_name: !user ? guestInfo.name : undefined,
        guest_email: !user ? guestInfo.email : undefined,
        guest_phone: !user ? guestInfo.phone : undefined,
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
        payment_method: selectedPaymentMethod,
      }

      // Debug log: print orderData before sending
      console.log('[DEBUG] orderData sent to API:', orderData);
      console.log('[DEBUG] getUserName() result:', getUserName());
      console.log('[DEBUG] user_email value:', user?.email);
      console.log('[DEBUG] User provider:', user?.app_metadata?.provider);

      // Call the API route for custom payment processing
      const res = await fetch('/api/checkout/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      const { order, paymentData, error } = await res.json()
      if (error) throw new Error(error)

      // Clear cart after successful order creation
      await clearCart()

      toast({
        title: "Pesanan berhasil dibuat!",
        description: "Anda akan diarahkan ke halaman pembayaran.",
      })

      // Redirect to payment page with payment data
      if (selectedPaymentMethod === 'QRIS') {
        router.push(`/payment/qris/${order.id}`)
      } else {
        router.push(`/payment/process?order_id=${order.id}&payment_id=${paymentData.id}`)
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
                <Label htmlFor="phone">
                  Nomor Telepon {requiresPhone && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={guestInfo.phone}
                  onChange={(e) => handleGuestInfoChange("phone", e.target.value)}
                  placeholder="Contoh: +6281234567890"
                  required={requiresPhone}
                />
                {requiresPhone && (
                  <p className="text-xs text-red-500 mt-1">
                    Nomor telepon diperlukan untuk metode pembayaran ini
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Format: +62 diikuti nomor HP tanpa angka 0 di depan
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <div className="space-y-4">
                {paymentCategories.map((category) => {
                  if (category.isSingle) {
                    // Render QRIS as a single card
                    const method = category.methods[0]
                    const methodInfo = PAYMENT_METHOD_DISPLAY[method as keyof typeof PAYMENT_METHOD_DISPLAY]
                    const isSelected = selectedPaymentMethod === method
                    return (
                      <div
                        key={method}
                        className={`flex flex-col border rounded-lg mb-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => handlePaymentMethodSelect(method)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={method} id={method} />
                            <span className="text-lg">{methodInfo?.icon ?? '❓'}</span>
                            <div>
                              <div className="font-medium text-sm">{methodInfo?.name ?? method}</div>
                              <div className="text-xs text-muted-foreground">{methodInfo?.category ?? 'Unknown'}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">Dipilih</Badge>
                          )}
                        </div>
                      </div>
                    )
                  }
                  const Icon = category.icon
                  return (
                    <Collapsible
                      key={category.id}
                      open={expandedCategory === category.id}
                      onOpenChange={(open) => setExpandedCategory(open ? category.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Icon className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">{category.description}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {category.methods.length} metode
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-2 pl-4">
                          {category.methods.map((method) => {
                            const methodInfo = PAYMENT_METHOD_DISPLAY[method as keyof typeof PAYMENT_METHOD_DISPLAY]
                            const isSelected = selectedPaymentMethod === method
                            const isEwallet = phoneRequiredMethods.includes(method)
                            return (
                              <div
                                key={method}
                                className={`flex flex-col border rounded-lg mb-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                              >
                                <div
                                  className="flex items-center justify-between p-3 cursor-pointer"
                                  onClick={() => handlePaymentMethodSelect(method)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <RadioGroupItem value={method} id={method} />
                                    <span className="text-lg">{methodInfo?.icon ?? '❓'}</span>
                                    <div>
                                      <div className="font-medium text-sm">{methodInfo?.name ?? method}</div>
                                      <div className="text-xs text-muted-foreground">{methodInfo?.category ?? 'Unknown'}</div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Badge variant="default" className="text-xs">Dipilih</Badge>
                                  )}
                                </div>
                                {/* Inline phone input for selected e-wallet */}
                                {isSelected && isEwallet && (
                                  <div className="px-4 pb-4">
                                    <Label htmlFor="phone">
                                      Nomor Telepon <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="phone"
                                      type="tel"
                                      value={guestInfo.phone}
                                      onChange={(e) => handleGuestInfoChange("phone", e.target.value)}
                                      placeholder="Contoh: +6281234567890"
                                      required
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Format: +62 diikuti nomor HP tanpa angka 0 di depan
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
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

            {/* Selected Payment Method */}
            {selectedPaymentMethod && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Metode Pembayaran:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {PAYMENT_METHOD_DISPLAY[selectedPaymentMethod as keyof typeof PAYMENT_METHOD_DISPLAY]?.icon}
                    </span>
                    <span className="font-medium text-sm">
                      {PAYMENT_METHOD_DISPLAY[selectedPaymentMethod as keyof typeof PAYMENT_METHOD_DISPLAY]?.name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={isProcessing || !selectedPaymentMethod}
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

