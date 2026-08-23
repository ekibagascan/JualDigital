"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Lock } from "lucide-react"

interface Tier {
  id: string
  name: string
  description?: string
  price_monthly: number
  price_yearly?: number
  perks?: string[]
  sort_order: number
}

interface Post {
  id: string
  title: string
  body?: string | null
  published_at?: string
  locked?: boolean
  is_public_teaser?: boolean
  media_type?: string
}

interface MembershipFeedProps {
  productId: string
}

export function MembershipFeed({ productId }: MembershipFeedProps) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isSeller, setIsSeller] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [feedRes, tiersRes] = await Promise.all([
        fetch(`/api/memberships/${productId}/feed`),
        fetch(`/api/memberships/${productId}/tiers`),
      ])
      const feed = await feedRes.json()
      const tiersData = await tiersRes.json()
      if (!feedRes.ok) throw new Error(feed.error || "Gagal memuat feed")
      setPosts(feed.posts || [])
      setIsSeller(!!feed.is_seller)
      setHasAccess(!!feed.has_access)
      setSubscription(feed.subscription || null)
      setTiers(tiersData.tiers || [])
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Gagal memuat komunitas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    load()
  }, [load])

  const subscribe = async (tierId: string) => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login untuk berlangganan.",
        variant: "destructive",
      })
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/memberships/${productId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, period_months: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal")
      if (data.needs_payment) {
        toast({
          title: "Pembayaran diperlukan",
          description: "Silakan checkout produk keanggotaan ini terlebih dahulu.",
        })
        window.location.href = `/product/${productId}`
        return
      }
      toast({ title: "Berhasil", description: data.message || "Langganan aktif" })
      await load()
    } catch (e) {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal berlangganan",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const createPost = async () => {
    if (!newTitle.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/memberships/${productId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), body: newBody.trim(), publish: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Berhasil", description: "Postingan dipublikasikan" })
      setNewTitle("")
      setNewBody("")
      await load()
    } catch (e) {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal membuat postingan",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse bg-muted rounded-lg" />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Komunitas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Konten eksklusif untuk anggota.{" "}
          <Link href={`/product/${productId}`} className="underline text-primary">
            Lihat produk
          </Link>
        </p>
        {subscription && (
          <Badge className="mt-2" variant="secondary">
            Langganan aktif sampai{" "}
            {new Date(String(subscription.current_period_end)).toLocaleDateString("id-ID")}
          </Badge>
        )}
      </div>

      {!hasAccess && !isSeller && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih paket keanggotaan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {tiers.map((tier) => (
              <div key={tier.id} className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">{tier.name}</h3>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                )}
                <p className="font-medium">{formatCurrency(tier.price_monthly)}/bulan</p>
                <Button disabled={busy} size="sm" onClick={() => subscribe(tier.id)}>
                  Berlangganan
                </Button>
              </div>
            ))}
            {tiers.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada paket tersedia.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isSeller && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buat postingan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Judul</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Isi</Label>
              <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={4} />
            </div>
            <Button disabled={busy || !newTitle.trim()} onClick={createPost}>
              Publikasikan
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{post.title}</CardTitle>
                {post.locked && <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              {post.published_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(post.published_at).toLocaleString("id-ID")}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {post.locked ? (
                <p className="text-sm text-muted-foreground">
                  Konten terkunci. Berlangganan untuk membaca.
                </p>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{post.body || ""}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && (
          <p className="text-muted-foreground text-sm">Belum ada postingan.</p>
        )}
      </div>
    </div>
  )
}
