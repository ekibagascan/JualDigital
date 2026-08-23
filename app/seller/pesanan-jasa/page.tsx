"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type ServiceOrder = {
  id: string
  status: string
  due_at?: string
  product_id: string
  products?: { title?: string }
}

export default function SellerServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/services/orders?role=seller")
        const data = await res.json()
        setOrders(data.orders || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pesanan Jasa</h1>
          <p className="text-muted-foreground text-sm">Kelola brief, pengerjaan, dan pengiriman hasil</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/seller/orders">Pesanan produk</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Memuat...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada pesanan jasa.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{o.products?.title || "Jasa"}</CardTitle>
                <Badge>{o.status}</Badge>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {o.due_at ? `Deadline: ${new Date(o.due_at).toLocaleDateString("id-ID")}` : "—"}
                </p>
                <Button size="sm" asChild>
                  <Link href={`/pesanan-jasa/${o.id}`}>Kelola</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
