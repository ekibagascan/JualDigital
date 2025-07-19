"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Calendar, RefreshCw } from "lucide-react"
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
}

export function PurchaseHistory() {
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState<Order[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchOrders = async () => {
      if (user?.id) {
        try {
          console.log('[PURCHASE HISTORY] Fetching orders for user:', user.id)

          const response = await fetch(`/api/orders?userId=${user.id}`)
          const data = await response.json()

          if (data.success) {
            setOrders(data.orders || [])

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

    fetchOrders()
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

  const getSellerName = (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId)
    return seller?.business_name || seller?.name || "Jual Digital"
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true
    if (activeTab === "completed") return order.status === "paid"
    if (activeTab === "processing") return order.status === "pending"
    return true
  })

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Semua ({orders.length})</TabsTrigger>
          <TabsTrigger value="completed">
            Selesai ({orders.filter((p) => p.status === "paid").length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Diproses ({orders.filter((p) => p.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2">Belum ada pembelian</h3>
              <p className="text-muted-foreground mb-6">Mulai jelajahi produk digital yang menarik</p>
              <Button asChild>
                <Link href="/categories">Jelajahi Produk</Link>
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
                        <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                          {order.status === "paid" ? "Selesai" : "Menunggu Pembayaran"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(order.total_amount + order.tax_amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items.length} produk{order.order_items.length > 1 ? '' : ''}
                      </p>
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
                          {order.status === "paid" ? (
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
