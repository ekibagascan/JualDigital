"use client"
import Image from "next/image"
import Link from "next/link"
import { Trash2, Plus, Minus, ShoppingBag, AlertTriangle, CreditCard, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useCart } from "@/components/providers/cart-provider"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"

export function CartContent() {
  const { items, updateQuantity, removeItem, getTotalPrice, loading, clearCart } = useCart()
  const { user } = useAuth()
  // const router = useRouter() // Not used
  const [isProcessing, setIsProcessing] = useState(false)
  const [note, setNote] = useState("")
  const [ownProducts, setOwnProducts] = useState<string[]>([])
  const [paymentSettings, setPaymentSettings] = useState({
    fiatEnabled: true,
    fiatMethod: 'dana' as 'dana' | 'manual',
    cryptoEnabled: true,
    defaultMethod: 'crypto' as 'crypto' | 'fiat'
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'crypto' | 'fiat'>('crypto')

  // Load payment settings
  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          // Convert old 'midtrans' to 'dana' for backward compatibility
          const fiatMethod = data.payment_fiat_method === 'midtrans' ? 'dana' : (data.payment_fiat_method || 'dana')
          setPaymentSettings({
            fiatEnabled: data.payment_fiat_enabled !== false,
            fiatMethod: fiatMethod,
            cryptoEnabled: data.payment_crypto_enabled !== false,
            defaultMethod: data.payment_default_method || 'fiat'
          })
          setSelectedPaymentMethod(data.payment_default_method || 'fiat')
        }
      } catch (error) {
        console.error('Error loading payment settings:', error)
      }
    }
    loadPaymentSettings()
  }, [])

  // Check for own products when items or user changes
  useEffect(() => {
    if (user?.id && items.length > 0) {
      const ownProductIds = items
        .filter(item => item.seller_id === user.id)
        .map(item => item.title)
      setOwnProducts(ownProductIds)
    } else {
      setOwnProducts([])
    }
  }, [items, user?.id])

  if (loading) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4">Memuat keranjang...</h2>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4">Keranjang Anda Kosong</h2>
        <p className="text-muted-foreground mb-8">Belum ada produk yang ditambahkan ke keranjang</p>
        <Button asChild>
          <Link href="/produk">Mulai Belanja</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Warning for own products */}
      {ownProducts.length > 0 && (
        <div className="lg:col-span-3">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Cannot Purchase Own Products</h3>
                  <p className="text-sm">
                    You cannot purchase your own products: {ownProducts.join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <Card key={item.id} className={item.seller_id === user?.id ? "border-orange-200 bg-orange-50" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 line-clamp-2">{item.title}</h3>
                  {item.variant_name && (
                    <p className="text-sm text-primary font-medium mb-1">{item.variant_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">oleh {item.seller_name || "Seller"}</p>
                  {item.seller_id === user?.id && (
                    <p className="text-sm text-orange-600 font-medium mb-2">⚠️ Your own product</p>
                  )}
                  <p className="font-bold text-primary">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">Ringkasan Pesanan</h2>

            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="line-clamp-1">
                    {item.title}
                    {item.variant_name && ` - ${item.variant_name}`} x{item.quantity}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Admin</span>
                <span>Gratis</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>

            {/* Note input for user to write a note to the seller */}
            <div className="mb-4">
              <label htmlFor="order-note" className="block text-sm font-medium mb-1">Catatan untuk Penjual (opsional)</label>
              <textarea
                id="order-note"
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                placeholder="Tulis catatan untuk penjual di sini..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* Payment Method Selection */}
            {(paymentSettings.fiatEnabled || paymentSettings.cryptoEnabled) && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium mb-2">Metode Pembayaran</label>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(value) => setSelectedPaymentMethod(value as 'crypto' | 'fiat')}
                  className="space-y-2"
                >
                  {paymentSettings.cryptoEnabled && (
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="crypto" id="payment-crypto" className="mt-1" />
                      <Label htmlFor="payment-crypto" className="flex-1 cursor-pointer">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Coins className="h-4 w-4" />
                          Crypto Payment (IDRT/USDC)
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Pembayaran cepat dengan cryptocurrency melalui BCI Gateway
                        </div>
                      </Label>
                    </div>
                  )}
                  {paymentSettings.fiatEnabled && (
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="fiat" id="payment-fiat" className="mt-1" />
                      <Label htmlFor="payment-fiat" className="flex-1 cursor-pointer">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Fiat Payment (Rupiah)
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Pembayaran menggunakan mata uang fiat
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={isProcessing || ownProducts.length > 0}
              onClick={async () => {
                if (ownProducts.length > 0) {
                  alert("Please remove your own products from the cart before proceeding.")
                  return
                }

                setIsProcessing(true)
                try {
                  // Prepare order data
                  const orderData = {
                    user_id: user?.id,
                    items: items.map(item => ({
                      product_id: item.product_id,
                      seller_id: item.seller_id,
                      title: item.title,
                      price: item.price,
                      quantity: item.quantity,
                      image_url: item.image_url,
                    })),
                    total_amount: getTotalPrice(),
                    tax_amount: 0,
                    payment_method: selectedPaymentMethod || "fiat", // Use selected method or default to fiat
                    note, // Include the note in the order data
                  }
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderData),
                  })
                  const data = await res.json()
                  if (data.paymentUrl) {
                    await clearCart()
                    window.location.href = data.paymentUrl
                  } else {
                    alert(data.error || "Gagal membuat pesanan. Silakan coba lagi.")
                  }
                } catch {
                  alert("Terjadi kesalahan saat membuat pesanan.")
                } finally {
                  setIsProcessing(false)
                }
              }}
            >
              {isProcessing ? "Memproses..." :
                ownProducts.length > 0 ? "Remove Own Products First" : "Lanjut Pembayaran"}
            </Button>

            <div className="mt-4 text-center">
              <Link href="/produk" className="text-sm text-primary hover:underline">
                Lanjut Belanja
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
