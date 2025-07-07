"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MessageSquare, Eye, Reply, Search, Clock, CheckCircle, Send } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  status: "unread" | "read" | "replied"
  category: "general" | "support" | "billing" | "technical"
}

export function MessageManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([
    {
      id: "1",
      name: "Ahmad Rizki",
      email: "ahmad@example.com",
      subject: "Pertanyaan tentang pembayaran",
      message:
        "Halo, saya ingin bertanya tentang metode pembayaran yang tersedia. Apakah bisa menggunakan transfer bank lokal? Saya sudah mencoba beberapa kali tapi selalu gagal. Mohon bantuannya.",
      date: "2024-01-15",
      status: "unread",
      category: "billing",
    },
    {
      id: "2",
      name: "Siti Nurhaliza",
      email: "siti@example.com",
      subject: "Masalah download produk",
      message:
        "Saya sudah membeli produk e-book digital marketing tapi tidak bisa download. Link yang diberikan tidak berfungsi. Tolong segera diperbaiki.",
      date: "2024-01-14",
      status: "read",
      category: "technical",
    },
    {
      id: "3",
      name: "Budi Santoso",
      email: "budi@example.com",
      subject: "Refund request",
      message:
        "Saya ingin mengajukan refund untuk pembelian template website karena tidak sesuai dengan deskripsi. Bagaimana prosedurnya?",
      date: "2024-01-13",
      status: "replied",
      category: "support",
    },
    {
      id: "4",
      name: "Maya Sari",
      email: "maya@example.com",
      subject: "Pertanyaan umum",
      message:
        "Apakah ada diskon untuk pembelian dalam jumlah banyak? Saya berencana membeli beberapa template sekaligus untuk proyek perusahaan.",
      date: "2024-01-12",
      status: "unread",
      category: "general",
    },
  ])

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [replyText, setReplyText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "replied">("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "general" | "support" | "billing" | "technical">("all")

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || message.status === statusFilter
    const matchesCategory = categoryFilter === "all" || message.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const unreadCount = messages.filter((m) => m.status === "unread").length

  const markAsRead = (messageId: string) => {
    setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, status: "read" as const } : msg)))
  }

  const markAsReplied = (messageId: string) => {
    setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, status: "replied" as const } : msg)))
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return

    try {
      // Simulate sending reply
      await new Promise((resolve) => setTimeout(resolve, 1000))

      markAsReplied(selectedMessage.id)
      setReplyText("")
      setSelectedMessage(null)

      toast({
        title: "Berhasil",
        description: "Balasan berhasil dikirim",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengirim balasan",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: ContactMessage["status"]) => {
    switch (status) {
      case "unread":
        return <Badge variant="destructive">Belum Dibaca</Badge>
      case "read":
        return <Badge variant="secondary">Dibaca</Badge>
      case "replied":
        return <Badge variant="default">Dibalas</Badge>
    }
  }

  const getCategoryBadge = (category: ContactMessage["category"]) => {
    const variants = {
      general: "outline",
      support: "secondary",
      billing: "default",
      technical: "destructive",
    } as const

    const labels = {
      general: "Umum",
      support: "Dukungan",
      billing: "Billing",
      technical: "Teknis",
    }

    return <Badge variant={variants[category]}>{labels[category]}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pesan Kontak</h2>
          <p className="text-muted-foreground">Kelola pesan dari pengguna ({unreadCount} belum dibaca)</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Semua ({messages.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Belum Dibaca ({messages.filter((m) => m.status === "unread").length})
          </TabsTrigger>
          <TabsTrigger value="read">Dibaca ({messages.filter((m) => m.status === "read").length})</TabsTrigger>
          <TabsTrigger value="replied">Dibalas ({messages.filter((m) => m.status === "replied").length})</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari pesan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Dibaca</option>
              <option value="replied">Dibalas</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Semua Kategori</option>
              <option value="general">Umum</option>
              <option value="support">Dukungan</option>
              <option value="billing">Billing</option>
              <option value="technical">Teknis</option>
            </select>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {filteredMessages.map((message) => (
            <Card key={message.id} className={message.status === "unread" ? "border-l-4 border-l-primary" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{message.name}</h3>
                      {getStatusBadge(message.status)}
                      {getCategoryBadge(message.category)}
                    </div>
                    <p className="text-sm text-muted-foreground">{message.email}</p>
                    <h4 className="font-medium">{message.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {message.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {message.status === "unread" && (
                      <Button variant="outline" size="sm" onClick={() => markAsRead(message.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Tandai Dibaca
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant={message.status === "replied" ? "outline" : "default"}
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(message)
                            if (message.status === "unread") {
                              markAsRead(message.id)
                            }
                          }}
                        >
                          <Reply className="mr-2 h-4 w-4" />
                          {message.status === "replied" ? "Lihat" : "Balas"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{message.status === "replied" ? "Detail Pesan" : "Balas Pesan"}</DialogTitle>
                          <DialogDescription>
                            Dari: {message.name} ({message.email})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Subjek</Label>
                            <p className="text-sm mt-1">{message.subject}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Pesan</Label>
                            <div className="mt-1 p-3 bg-muted rounded-md">
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                          </div>
                          {message.status !== "replied" && (
                            <div className="space-y-2">
                              <Label htmlFor="reply">Balasan</Label>
                              <Textarea
                                id="reply"
                                placeholder="Tulis balasan Anda..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={4}
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                                  Batal
                                </Button>
                                <Button onClick={handleReply} disabled={!replyText.trim()}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Kirim Balasan
                                </Button>
                              </div>
                            </div>
                          )}
                          {message.status === "replied" && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Pesan telah dibalas</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredMessages.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Tidak ada pesan</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                    ? "Tidak ada pesan yang sesuai dengan filter"
                    : "Belum ada pesan masuk"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread">
          <div className="space-y-4">
            {filteredMessages
              .filter((m) => m.status === "unread")
              .map((message) => (
                <Card key={message.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{message.name}</h3>
                          {getStatusBadge(message.status)}
                          {getCategoryBadge(message.category)}
                        </div>
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                        <h4 className="font-medium">{message.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => markAsRead(message.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Tandai Dibaca
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedMessage(message)
                                markAsRead(message.id)
                              }}
                            >
                              <Reply className="mr-2 h-4 w-4" />
                              Balas
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Balas Pesan</DialogTitle>
                              <DialogDescription>
                                Dari: {message.name} ({message.email})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Subjek</Label>
                                <p className="text-sm mt-1">{message.subject}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Pesan</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md">
                                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="reply">Balasan</Label>
                                <Textarea
                                  id="reply"
                                  placeholder="Tulis balasan Anda..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={4}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                                    Batal
                                  </Button>
                                  <Button onClick={handleReply} disabled={!replyText.trim()}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Kirim Balasan
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="read">
          <div className="space-y-4">
            {filteredMessages
              .filter((m) => m.status === "read")
              .map((message) => (
                <Card key={message.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{message.name}</h3>
                          {getStatusBadge(message.status)}
                          {getCategoryBadge(message.category)}
                        </div>
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                        <h4 className="font-medium">{message.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedMessage(message)}>
                              <Reply className="mr-2 h-4 w-4" />
                              Balas
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Balas Pesan</DialogTitle>
                              <DialogDescription>
                                Dari: {message.name} ({message.email})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Subjek</Label>
                                <p className="text-sm mt-1">{message.subject}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Pesan</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md">
                                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="reply">Balasan</Label>
                                <Textarea
                                  id="reply"
                                  placeholder="Tulis balasan Anda..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={4}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                                    Batal
                                  </Button>
                                  <Button onClick={handleReply} disabled={!replyText.trim()}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Kirim Balasan
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="replied">
          <div className="space-y-4">
            {filteredMessages
              .filter((m) => m.status === "replied")
              .map((message) => (
                <Card key={message.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{message.name}</h3>
                          {getStatusBadge(message.status)}
                          {getCategoryBadge(message.category)}
                        </div>
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                        <h4 className="font-medium">{message.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedMessage(message)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detail Pesan</DialogTitle>
                              <DialogDescription>
                                Dari: {message.name} ({message.email})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Subjek</Label>
                                <p className="text-sm mt-1">{message.subject}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Pesan</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md">
                                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                </div>
                              </div>
                              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">Pesan telah dibalas</span>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
