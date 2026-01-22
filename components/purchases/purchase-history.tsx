"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Calendar, RefreshCw, CreditCard, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface OrderItem {
  id: string
  product_title: string
  price: number
  quantity: number
  created_at: string
  seller_id: string
  products?: {
    title: string
    image_url?: string
  }
}

interface Seller {
  id: string
  name?: string
  business_name?: string
}

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  tax_amount: number
  created_at: string
  order_items: OrderItem[]
  payment_provider?: string
  invoice_url?: string
  updated_at?: string
}

export function PurchaseHistory() {
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState<Order[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchOrders = async () => {
    if (user?.id) {
      try {
        console.log('[PURCHASE HISTORY] Fetching orders for user:', user.id)

        const response = await fetch(`/api/orders?userId=${user.id}`, {
          cache: 'no-store', // Prevent caching
        })
        const data = await response.json()

        if (data.success) {
          const fetchedOrders = data.orders || []
          console.log('[PURCHASE HISTORY] Fetched orders:', fetchedOrders.length)
          console.log('[PURCHASE HISTORY] Order statuses:', fetchedOrders.map((o: Order) => ({
            order_number: o.order_number,
            status: o.status,
            normalized: o.status?.toLowerCase().trim(),
            isPaid: o.status?.toLowerCase().trim() === 'paid'
          })))
          console.log('[PURCHASE HISTORY] Paid orders count:', fetchedOrders.filter((o: Order) => o.status?.toLowerCase().trim() === 'paid').length)
          setOrders(fetchedOrders)

          // Extract unique seller IDs from order items
          const sellerIds = new Set<string>()
          data.orders?.forEach((order: Order) => {
            order.order_items?.forEach((item: OrderItem) => {
              if (item.seller_id) {
                sellerIds.add(item.seller_id)
              }
            })
          })

          // Fetch seller information
          if (sellerIds.size > 0) {
            const sellerIdsString = Array.from(sellerIds).join(',')
            const sellersResponse = await fetch(`/api/sellers?sellerIds=${sellerIdsString}`)
            const sellersData = await sellersResponse.json()

            if (sellersData.success) {
              setSellers(sellersData.sellers || [])
            }
          }
        } else {
          console.error('Failed to fetch orders:', data.error)
          toast({
            title: "Error",
            description: "Gagal memuat riwayat pembelian.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
        toast({
          title: "Error",
          description: "Gagal memuat riwayat pembelian.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Auto-refresh orders every 30 seconds to catch status updates
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      console.log('[PURCHASE HISTORY] Auto-refreshing orders...')
      fetchOrders()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground mb-8">Silakan login untuk melihat riwayat pembelian Anda</p>
        <Button asChild>
          <Link href="/login">Login Sekarang</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Memuat riwayat pembelian...</p>
      </div>
    )
  }

  const handleDownload = (orderItem: OrderItem) => {
    // Mock download - in real implementation, this would trigger actual download
    toast({
      title: "Download dimulai",
      description: `Mengunduh ${orderItem.product_title}...`,
    })

    console.log("Downloading:", orderItem.product_title)
  }

  const handleRedownload = (orderItem: OrderItem) => {
    toast({
      title: "Link download dikirim",
      description: `Link download baru untuk ${orderItem.product_title} telah dikirim ke email Anda.`,
    })
  }

  const handleRegeneratePayment = async (order: Order) => {
    try {
      const response = await fetch('/api/payments/dana/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: order.id }),
      })

      const data = await response.json()

      if (response.ok && data.payment_url) {
        // Open new payment URL
        window.open(data.payment_url, '_blank')
        toast({
          title: "Pembayaran Baru Dibuat",
          description: "Halaman pembayaran baru telah dibuka. Silakan selesaikan pembayaran dalam 30 menit.",
        })
        // Refresh orders list
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: data.error || "Gagal membuat pembayaran baru",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error regenerating payment:', error)
      toast({
        title: "Error",
        description: "Gagal membuat pembayaran baru",
        variant: "destructive",
      })
    }
  }

  const isPaymentExpired = (order: Order): boolean => {
    if (order.status?.toLowerCase().trim() !== 'pending' || order.payment_provider !== 'dana') {
      return false
    }
    // Check if order was created more than 30 minutes ago
    const createdAt = new Date(order.created_at)
    const now = new Date()
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    return minutesSinceCreation > 30
  }

  const getTimeRemaining = (order: Order): string | null => {
    if (order.status?.toLowerCase().trim() !== 'pending' || order.payment_provider !== 'dana') {
      return null
    }
    const createdAt = new Date(order.created_at)
    const expirationTime = new Date(createdAt.getTime() + (30 * 60 * 1000)) // 30 minutes
    const now = new Date()

    if (now > expirationTime) {
      return 'Kedaluwarsa'
    }

    const minutesRemaining = Math.floor((expirationTime.getTime() - now.getTime()) / (1000 * 60))
    return `${minutesRemaining} menit tersisa`
  }

  const getSellerName = (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId)
    return seller?.business_name || seller?.name || "Jual Digital"
  }

  const filteredOrders = orders.filter((order) => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = order.status?.toLowerCase().trim()
    const isPaid = normalizedStatus === "paid"
    const isPending = normalizedStatus === "pending"
    
    if (activeTab === "all") return true
    if (activeTab === "completed") {
      const result = isPaid
      if (!result) {
        console.log('[PURCHASE HISTORY] Order filtered out from completed:', {
          order_number: order.order_number,
          status: order.status,
          normalized: normalizedStatus,
          isPaid
        })
      }
      return result
    }
    if (activeTab === "processing") return isPending
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Riwayat pembelian dan download produk digital Anda</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true)
            fetchOrders().finally(() => setLoading(false))
          }}
          disabled={loading}
        >
          <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Semua ({orders.length})</TabsTrigger>
          <TabsTrigger value="completed">
            Selesai ({orders.filter((p) => p.status?.toLowerCase().trim() === "paid").length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Diproses ({orders.filter((p) => p.status?.toLowerCase().trim() === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2">Belum ada pembelian</h3>
              <p className="text-muted-foreground mb-6">Mulai jelajahi produk digital yang menarik</p>
              <Button asChild>
                <Link href="/produk">Jelajahi Produk</Link>
              </Button>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Order #{order.order_number}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.created_at)}
                        </span>
                        <Badge variant={order.status?.toLowerCase().trim() === "paid" ? "default" : "secondary"}>
                          {order.status?.toLowerCase().trim() === "paid" ? "Selesai" : "Menunggu Pembayaran"}
                        </Badge>
                        {order.status?.toLowerCase().trim() === "pending" && order.payment_provider === "dana" && (
                          <span className="text-xs text-orange-600">
                            {isPaymentExpired(order) ? '⏰ Kedaluwarsa' : getTimeRemaining(order)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(order.total_amount + order.tax_amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items.length} produk{order.order_items.length > 1 ? '' : ''}
                      </p>
                      {order.status?.toLowerCase().trim() === "pending" && order.payment_provider === "dana" && (
                        <>
                          {isPaymentExpired(order) ? (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleRegeneratePayment(order)}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Buat Pembayaran Baru
                            </Button>
                          ) : order.invoice_url ? (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => window.open(order.invoice_url, '_blank')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Lanjutkan Pembayaran
                            </Button>
                          ) : null}
                          {!isPaymentExpired(order) && getTimeRemaining(order) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {getTimeRemaining(order)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Image
                          src={item.products?.image_url || "/placeholder.svg"}
                          alt={item.product_title}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />

                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{item.product_title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getSellerName(item.seller_id)}
                          </p>
                          <p className="font-semibold text-primary">{formatCurrency(item.price)}</p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {order.status?.toLowerCase().trim() === "paid" ? (
                            <>
                              <Button size="sm" onClick={() => handleDownload(item)}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRedownload(item)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Kirim Ulang
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary">Menunggu Pembayaran</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
