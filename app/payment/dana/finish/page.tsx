"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, XCircle, Clock, RefreshCw, Package } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"

interface OrderItem {
  id: string
  product_title: string
  price: number
  quantity: number
  products?: {
    title: string
    image_url?: string
  }
}

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  tax_amount: number
  created_at: string
  order_items: OrderItem[]
}

export default function DanaFinishPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")
  const transactionStatus = searchParams.get("transactionStatus")
  const [loading, setLoading] = useState(true)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pollingCount, setPollingCount] = useState(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkOrderStatus = async (isManualRefresh = false) => {
    if (!orderId) {
      setLoading(false)
      return
    }

    if (isManualRefresh) {
      setIsRefreshing(true)
    }

    try {
      // Try to fetch by order_number first (if it looks like ORD-XXXX)
      let res
      let orderNumber: string | null = null
      
      if (orderId?.startsWith('ORD-')) {
        // Search by order_number
        orderNumber = orderId
        res = await fetch(`/api/orders?order_number=${orderId}`)
      } else {
        // Try as UUID
        res = await fetch(`/api/orders/${orderId}`)
      }

      if (res.ok) {
        const data = await res.json()
        const fetchedOrder = data.order || (data.orders && data.orders[0])

        console.log('[DANA FINISH PAGE] Fetched order:', fetchedOrder)
        console.log('[DANA FINISH PAGE] Order items:', fetchedOrder?.order_items)

        if (fetchedOrder) {
          setOrder(fetchedOrder)
          const status = fetchedOrder.status
          setOrderStatus(status)
          
          // Get order_number for DANA status check
          if (!orderNumber && fetchedOrder.order_number) {
            orderNumber = fetchedOrder.order_number
          }

          // If order is still pending, also check DANA API directly
          if (status === 'pending' && orderNumber) {
            try {
              console.log('[DANA FINISH PAGE] Checking DANA payment status for:', orderNumber)
              const danaStatusRes = await fetch(`/api/payments/dana/status?order_number=${orderNumber}`)
              if (danaStatusRes.ok) {
                const danaStatus = await danaStatusRes.json()
                console.log('[DANA FINISH PAGE] DANA status:', danaStatus)
                
                if (danaStatus.status === 'success' || danaStatus.status === 'paid') {
                  // Payment confirmed by DANA, refresh order
                  setPaymentStatus('success')
                  setOrderStatus('paid')
                  // Stop polling
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current)
                    pollingIntervalRef.current = null
                  }
                  // Refresh order data
                  setTimeout(() => checkOrderStatus(false), 1000)
                  return
                }
              }
            } catch (danaError) {
              console.error('[DANA FINISH PAGE] Error checking DANA status:', danaError)
            }
          }

          // Determine payment status from order status
          if (status === 'paid') {
            setPaymentStatus('success')
            // Stop polling if paid
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          } else if (status === 'pending') {
            setPaymentStatus('pending')
          } else if (status === 'cancelled') {
            setPaymentStatus('failed')
            // Stop polling if cancelled
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          }
        } else {
          console.warn('[DANA FINISH PAGE] No order found in response:', data)
        }
      } else {
        console.error('[DANA FINISH PAGE] Failed to fetch order:', res.status, res.statusText)
      }
    } catch (error) {
      console.error("Error checking order status:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    let shouldPoll = false

    // Check payment status from URL params first (DANA sends these)
    if (transactionStatus) {
      const statusUpper = transactionStatus.toUpperCase()
      if (statusUpper === 'SUCCESS' || statusUpper === 'PAID') {
        setPaymentStatus('success')
        setOrderStatus('paid')
        // Still fetch order details
        checkOrderStatus()
        return
      } else if (statusUpper === 'PENDING') {
        setPaymentStatus('pending')
        setOrderStatus('pending')
        shouldPoll = true
        // Fetch order and start polling
        checkOrderStatus()
      } else if (statusUpper === 'FAILED' || statusUpper === 'CANCELLED' || statusUpper === 'EXPIRED') {
        setPaymentStatus('failed')
        setOrderStatus('cancelled')
        checkOrderStatus()
        return
      }
    } else {
      // No URL params, check order status
      shouldPoll = true
      checkOrderStatus()
    }

    // If status is pending, start polling every 5 seconds (max 12 times = 1 minute)
    if (shouldPoll) {
      // Wait a bit before starting to poll
      const timeoutId = setTimeout(() => {
        pollingIntervalRef.current = setInterval(() => {
          setPollingCount(prev => {
            if (prev >= 12) {
              // Stop after 12 attempts (1 minute)
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
              return prev
            }
            checkOrderStatus()
            return prev + 1
          })
        }, 5000)
      }, 2000) // Start polling after 2 seconds

      // Cleanup on unmount
      return () => {
        clearTimeout(timeoutId)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, transactionStatus])

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

  // Determine what to show based on payment status
  const getStatusContent = () => {
    if (paymentStatus === 'success' || orderStatus === 'paid') {
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: "Pembayaran Berhasil!",
        message: "Terima kasih! Pembayaran Anda telah dikonfirmasi. Email konfirmasi dan link download telah dikirim ke email Anda.",
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800"
      }
    } else if (paymentStatus === 'pending' || orderStatus === 'pending') {
      return {
        icon: <Clock className="h-6 w-6 text-yellow-500" />,
        title: "Pembayaran Pending",
        message: "Pembayaran Anda sedang menunggu konfirmasi. Kami akan mengirimkan email konfirmasi dan link download setelah pembayaran dikonfirmasi.",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        borderColor: "border-yellow-200 dark:border-yellow-800"
      }
    } else if (paymentStatus === 'failed' || orderStatus === 'cancelled') {
      return {
        icon: <XCircle className="h-6 w-6 text-red-500" />,
        title: "Pembayaran Gagal",
        message: "Maaf, pembayaran Anda gagal atau dibatalkan. Silakan coba lagi atau gunakan metode pembayaran lain.",
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800"
      }
    } else {
      // Default message
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: "Terima Kasih!",
        message: "Pembayaran Anda sedang diproses. Kami akan mengirimkan email konfirmasi dan link download setelah pembayaran dikonfirmasi.",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        borderColor: "border-blue-200 dark:border-blue-800"
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
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Order ID:</strong> {orderId}
                </p>
                {order && (
                  <>
                    <p className="text-sm">
                      <strong>Total:</strong> {formatCurrency(order.total_amount + (order.tax_amount || 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Tanggal:</strong> {new Date(order.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Product Details */}
            {order && order.order_items && order.order_items.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Detail Produk
                </h3>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {item.products?.image_url && (
                        <Image
                          src={item.products.image_url}
                          alt={item.product_title || item.products.title}
                          width={60}
                          height={60}
                          className="rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.product_title || item.products?.title || 'Produk'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button and Polling Status */}
            {(paymentStatus === 'pending' || orderStatus === 'pending') && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {pollingIntervalRef.current
                      ? `Memverifikasi pembayaran... (${pollingCount}/12)`
                      : 'Menunggu verifikasi pembayaran'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkOrderStatus(true)}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memuat...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
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
