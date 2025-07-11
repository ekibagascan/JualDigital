"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Calendar, Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { OrderService } from "@/lib/order-service"
import { downloadService } from "@/lib/download-service"



export function PurchaseHistory() {
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchOrders = async () => {
      if (user?.id) {
        try {
          const supabase = createClientComponentClient()
          const orderService = new OrderService(supabase)

          const userOrders = await orderService.getUserOrders(user.id)
          setOrders(userOrders)
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

  const handleDownload = (item: any) => {
    if (item.downloadCount >= item.downloadLimit) {
      toast({
        title: "Batas download tercapai",
        description: "Anda telah mencapai batas maksimal download untuk produk ini.",
        variant: "destructive",
      })
      return
    }

    // Mock download
    toast({
      title: "Download dimulai",
      description: `Mengunduh ${item.title}...`,
    })

    // In real implementation, this would trigger actual download
    console.log("Downloading:", item.title)
  }

  const handleRedownload = (item: any) => {
    toast({
      title: "Link download dikirim",
      description: "Link download baru telah dikirim ke email Anda.",
    })
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
                      <p className="text-sm text-muted-foreground">1 produk</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <Image
                        src="/placeholder.svg"
                        alt="Product"
                        width={80}
                        height={80}
                        className="rounded-lg object-cover"
                      />

                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Digital Product</h4>
                        <p className="text-sm text-muted-foreground mb-2">Digital Marketplace</p>
                        <p className="font-semibold text-primary">{formatCurrency(order.total_amount)}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {order.status === "paid" ? (
                          <>
                            <Button size="sm" onClick={() => handleDownload({ id: order.id, title: "Digital Product" })}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRedownload({ id: order.id, title: "Digital Product" })}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Kirim Ulang
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary">Menunggu Pembayaran</Badge>
                        )}
                      </div>
                    </div>
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
