"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Megaphone,
  Plus,
  Send,
  Edit,
  Trash2,
  Users,
  Mail,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Announcement {
  id: string
  title: string
  content: string
  type: "info" | "warning" | "success" | "error"
  targetAudience: "all" | "buyers" | "sellers"
  status: "draft" | "sent"
  createdAt: string
  sentAt?: string
  recipientCount?: number
}

export function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Pemeliharaan Sistem Terjadwal",
      content:
        "Sistem akan mengalami pemeliharaan pada tanggal 20 Januari 2024 pukul 02:00 - 04:00 WIB. Mohon maaf atas ketidaknyamanannya.",
      type: "warning",
      targetAudience: "all",
      status: "sent",
      createdAt: "2024-01-15",
      sentAt: "2024-01-15",
      recipientCount: 1250,
    },
    {
      id: "2",
      title: "Fitur Baru: Sistem Review",
      content:
        "Kami telah menambahkan fitur review dan rating untuk produk. Sekarang pembeli dapat memberikan ulasan untuk produk yang telah dibeli.",
      type: "success",
      targetAudience: "all",
      status: "sent",
      createdAt: "2024-01-10",
      sentAt: "2024-01-10",
      recipientCount: 1250,
    },
    {
      id: "3",
      title: "Promo Spesial untuk Seller",
      content: "Dapatkan komisi 0% untuk 10 produk pertama yang Anda jual bulan ini!",
      type: "info",
      targetAudience: "sellers",
      status: "draft",
      createdAt: "2024-01-16",
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "info" as Announcement["type"],
    targetAudience: "all" as Announcement["targetAudience"],
  })

  const getTypeIcon = (type: Announcement["type"]) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4" />
      case "warning":
        return <AlertCircle className="h-4 w-4" />
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "error":
        return <XCircle className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: Announcement["type"]) => {
    const variants = {
      info: "default",
      warning: "destructive",
      success: "default",
      error: "destructive",
    } as const

    const labels = {
      info: "Info",
      warning: "Peringatan",
      success: "Sukses",
      error: "Error",
    }

    return <Badge variant={variants[type]}>{labels[type]}</Badge>
  }

  const getAudienceBadge = (audience: Announcement["targetAudience"]) => {
    const labels = {
      all: "Semua Pengguna",
      buyers: "Pembeli",
      sellers: "Penjual",
    }

    return <Badge variant="outline">{labels[audience]}</Badge>
  }

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: "Error",
        description: "Judul dan konten harus diisi",
        variant: "destructive",
      })
      return
    }

    const announcement: Announcement = {
      id: Date.now().toString(),
      ...newAnnouncement,
      status: "draft",
      createdAt: new Date().toISOString().split("T")[0],
    }

    setAnnouncements([announcement, ...announcements])
    setNewAnnouncement({
      title: "",
      content: "",
      type: "info",
      targetAudience: "all",
    })
    setIsCreateDialogOpen(false)

    toast({
      title: "Berhasil",
      description: "Pengumuman berhasil dibuat",
    })
  }

  const handleSendAnnouncement = async (announcementId: string) => {
    const announcement = announcements.find((a) => a.id === announcementId)
    if (!announcement) return

    try {
      // Simulate sending email
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const recipientCount =
        announcement.targetAudience === "all" ? 1250 : announcement.targetAudience === "buyers" ? 800 : 450

      setAnnouncements(
        announcements.map((a) =>
          a.id === announcementId
            ? {
                ...a,
                status: "sent" as const,
                sentAt: new Date().toISOString().split("T")[0],
                recipientCount,
              }
            : a,
        ),
      )

      toast({
        title: "Berhasil",
        description: `Pengumuman berhasil dikirim ke ${recipientCount} pengguna`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengirim pengumuman",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAnnouncement = (announcementId: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== announcementId))
    toast({
      title: "Berhasil",
      description: "Pengumuman berhasil dihapus",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pengumuman</h2>
          <p className="text-muted-foreground">Kelola pengumuman dan notifikasi untuk pengguna</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Buat Pengumuman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buat Pengumuman Baru</DialogTitle>
              <DialogDescription>Buat pengumuman yang akan dikirim via email ke pengguna</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="Masukkan judul pengumuman"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Konten</Label>
                <Textarea
                  id="content"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="Tulis konten pengumuman..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(value: Announcement["type"]) =>
                      setNewAnnouncement({ ...newAnnouncement, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Peringatan</SelectItem>
                      <SelectItem value="success">Sukses</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Audiens</Label>
                  <Select
                    value={newAnnouncement.targetAudience}
                    onValueChange={(value: Announcement["targetAudience"]) =>
                      setNewAnnouncement({ ...newAnnouncement, targetAudience: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Pengguna</SelectItem>
                      <SelectItem value="buyers">Pembeli</SelectItem>
                      <SelectItem value="sellers">Penjual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleCreateAnnouncement}>Buat Pengumuman</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(announcement.type)}
                    <h3 className="text-lg font-semibold">{announcement.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(announcement.type)}
                    {getAudienceBadge(announcement.targetAudience)}
                    <Badge variant={announcement.status === "sent" ? "default" : "secondary"}>
                      {announcement.status === "sent" ? "Terkirim" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {announcement.status === "draft" && (
                    <Button size="sm" onClick={() => handleSendAnnouncement(announcement.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Kirim
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setEditingAnnouncement(announcement)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{announcement.content}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Dibuat: {announcement.createdAt}
                </span>
                {announcement.sentAt && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Dikirim: {announcement.sentAt}
                  </span>
                )}
                {announcement.recipientCount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {announcement.recipientCount} penerima
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Belum ada pengumuman</h3>
              <p className="text-muted-foreground mb-4">Buat pengumuman pertama untuk berkomunikasi dengan pengguna</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Buat Pengumuman
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
