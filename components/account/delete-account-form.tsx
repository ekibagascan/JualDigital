"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"

export function DeleteAccountForm() {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (confirmation.trim() !== "HAPUS" || isDeleting) return

    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ confirmation: "HAPUS" }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Gagal menghapus akun")
      }

      await supabase.auth.signOut()
      router.replace("/account/deleted")
    } catch (error) {
      toast({
        title: "Penghapusan gagal",
        description: error instanceof Error ? error.message : "Gagal menghapus akun",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hapus akun</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Penghapusan ini permanen dan tidak bisa dibatalkan.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Akun login, profil, keranjang, wishlist, dan ulasan ikut terhapus.</li>
              <li>Produk yang Anda jual akan dinonaktifkan.</li>
              <li>Catatan pesanan tetap disimpan tanpa nama dan email, untuk keperluan transaksi.</li>
            </ul>
          </div>

          <div>
            <Label htmlFor="confirm-delete">Ketik HAPUS untuk melanjutkan</Label>
            <Input
              id="confirm-delete"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder="HAPUS"
            />
          </div>

          <Button
            type="submit"
            variant="destructive"
            disabled={confirmation.trim() !== "HAPUS" || isDeleting}
          >
            {isDeleting ? "Menghapus akun..." : "Hapus akun secara permanen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
