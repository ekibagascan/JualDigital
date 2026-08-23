"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type ServiceOrder = { id: string; status: string; product_id?: string }
type Enrollment = { product_id: string; products?: { title?: string } }
type Subscription = {
  id: string
  product_id: string
  status: string
  products?: { title?: string }
}

/** Panel perpustakaan: kursus, jasa, keanggotaan */
export function MyLibraryPanels() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch("/api/services/orders?role=buyer").then((r) => r.json()).catch(() => ({})),
          fetch("/api/courses/mine").then((r) => r.json()).catch(() => ({})),
          fetch("/api/memberships/mine").then((r) => r.json()).catch(() => ({})),
        ])
        setServiceOrders(a.orders || [])
        setEnrollments(b.enrollments || [])
        setSubs(c.subscriptions || [])
      } catch {
        /* ignore */
      }
    })()
  }, [])

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-xl font-semibold">Perpustakaan saya</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div id="kursus" className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Kursus saya</h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kursus.</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li key={e.product_id}>
                  <Link className="text-primary hover:underline text-sm" href={`/belajar/${e.product_id}`}>
                    {e.products?.title || "Lanjutkan belajar"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="jasa" className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Pesanan jasa</h3>
          {serviceOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pesanan jasa.</p>
          ) : (
            <ul className="space-y-2">
              {serviceOrders.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 text-sm items-center">
                  <Link className="text-primary hover:underline" href={`/pesanan-jasa/${o.id}`}>
                    Lihat pesanan
                  </Link>
                  <Badge variant="secondary">{o.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="keanggotaan" className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Keanggotaan saya</h3>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum berlangganan.</p>
          ) : (
            <ul className="space-y-2">
              {subs.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 text-sm items-center">
                  <Link className="text-primary hover:underline" href={`/komunitas/${s.product_id}`}>
                    {s.products?.title || "Buka komunitas"}
                  </Link>
                  <Badge variant="secondary">{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
