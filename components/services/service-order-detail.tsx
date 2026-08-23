"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

const STATUS_LABEL: Record<string, string> = {
  awaiting_requirements: "Menunggu brief",
  in_progress: "Dikerjakan",
  delivered: "Hasil dikirim",
  revision: "Revisi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

interface ServiceOrderDetailProps {
  orderId: string
}

export function ServiceOrderDetail({ orderId }: ServiceOrderDetailProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)
  const [requirements, setRequirements] = useState<unknown[]>([])
  const [deliverables, setDeliverables] = useState<Array<Record<string, unknown>>>([])
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([])
  const [briefText, setBriefText] = useState("")
  const [chatText, setChatText] = useState("")
  const [deliverableNote, setDeliverableNote] = useState("")
  const [deliverableLink, setDeliverableLink] = useState("")
  const [revisionNote, setRevisionNote] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/orders/${orderId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memuat")
      setOrder(data.order)
      setRequirements(data.requirements || [])
      setDeliverables(data.deliverables || [])
      setMessages(data.messages || [])
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Gagal memuat pesanan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const isBuyer = user?.id === order?.buyer_id
  const isSeller = user?.id === order?.seller_id
  const status = String(order?.status || "")

  const postJson = async (url: string, body?: unknown) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal")
      toast({ title: "Berhasil", description: data.message || "Berhasil" })
      await load()
      return data
    } catch (e) {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse bg-muted rounded-lg" />
  }

  if (!order) {
    return <p className="text-muted-foreground">Pesanan tidak ditemukan.</p>
  }

  const pkg = order.service_packages as Record<string, unknown> | undefined
  const product = order.products as Record<string, unknown> | undefined

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{String(product?.title || "Jasa")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Paket: {String(pkg?.title || "-")} · Deadline:{" "}
              {order.due_at ? new Date(String(order.due_at)).toLocaleDateString("id-ID") : "-"}
            </p>
          </div>
          <Badge variant="secondary">{STATUS_LABEL[status] || status}</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Revisi: {Number(order.revision_count || 0)} / {Number(pkg?.revisions ?? 1)}
        </CardContent>
      </Card>

      {/* Brief */}
      {(status === "awaiting_requirements" || requirements.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brief / Persyaratan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requirements.length > 0 && (
              <div className="space-y-2">
                {(requirements as Array<{ id: string; answers: unknown; created_at: string }>).map((r) => (
                  <div key={r.id} className="rounded-md border p-3 text-sm whitespace-pre-wrap">
                    {typeof r.answers === "object" && r.answers && "brief" in (r.answers as object)
                      ? String((r.answers as { brief: string }).brief)
                      : JSON.stringify(r.answers, null, 2)}
                  </div>
                ))}
              </div>
            )}
            {isBuyer && status === "awaiting_requirements" && (
              <div className="space-y-2">
                <Label>Kirim brief Anda</Label>
                <Textarea
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  placeholder="Jelaskan kebutuhan, referensi, dan deadline..."
                  rows={4}
                />
                <Button
                  disabled={busy || !briefText.trim()}
                  onClick={() =>
                    postJson(`/api/services/orders/${orderId}/requirements`, {
                      answers: { brief: briefText.trim() },
                    }).then(() => setBriefText(""))
                  }
                >
                  Kirim Brief
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hasil Kerja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deliverables.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada hasil yang dikirim.</p>
          )}
          {deliverables.map((d) => (
            <div key={String(d.id)} className="rounded-md border p-3 text-sm space-y-1">
              {typeof d.note === "string" && d.note ? (
                <p className="whitespace-pre-wrap">{d.note}</p>
              ) : null}
              {typeof d.link_url === "string" && d.link_url ? (
                <a href={d.link_url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {d.link_url}
                </a>
              ) : null}
              {typeof d.file_url === "string" && d.file_url ? (
                <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary underline block">
                  Unduh file
                </a>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {d.created_at ? new Date(String(d.created_at)).toLocaleString("id-ID") : ""}
              </p>
            </div>
          ))}

          {isSeller && (status === "in_progress" || status === "revision") && (
            <div className="space-y-2 border-t pt-4">
              <Label>Kirim hasil</Label>
              <Input
                placeholder="Link hasil (Drive, Figma, dll)"
                value={deliverableLink}
                onChange={(e) => setDeliverableLink(e.target.value)}
              />
              <Textarea
                placeholder="Catatan untuk pembeli"
                value={deliverableNote}
                onChange={(e) => setDeliverableNote(e.target.value)}
                rows={3}
              />
              <Button
                disabled={busy || (!deliverableLink.trim() && !deliverableNote.trim())}
                onClick={() =>
                  postJson(`/api/services/orders/${orderId}/deliverables`, {
                    link_url: deliverableLink.trim() || null,
                    note: deliverableNote.trim() || null,
                  }).then(() => {
                    setDeliverableLink("")
                    setDeliverableNote("")
                  })
                }
              >
                Kirim Hasil
              </Button>
            </div>
          )}

          {isBuyer && status === "delivered" && (
            <div className="flex flex-col sm:flex-row gap-3 border-t pt-4">
              <Button disabled={busy} onClick={() => postJson(`/api/services/orders/${orderId}/accept`)}>
                Terima &amp; Selesaikan
              </Button>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Catatan revisi (opsional)"
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={2}
                />
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    postJson(`/api/services/orders/${orderId}/revision`, {
                      note: revisionNote.trim(),
                    }).then(() => setRevisionNote(""))
                  }
                >
                  Minta Revisi
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Percakapan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-72 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
            )}
            {messages.map((m) => (
              <div
                key={String(m.id)}
                className={`rounded-md p-3 text-sm ${
                  m.sender_id === user?.id ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                }`}
              >
                <p className="whitespace-pre-wrap">{String(m.body)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.created_at ? new Date(String(m.created_at)).toLocaleString("id-ID") : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t" />
          {(isBuyer || isSeller) && (
            <div className="flex gap-2">
              <Textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Tulis pesan..."
                rows={2}
                className="flex-1"
              />
              <Button
                disabled={busy || !chatText.trim()}
                onClick={() =>
                  postJson(`/api/services/orders/${orderId}/messages`, {
                    body: chatText.trim(),
                  }).then(() => setChatText(""))
                }
              >
                Kirim
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
