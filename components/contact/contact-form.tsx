"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    content: "support@jualdigital.com",
    description: "Kirim email kapan saja",
  },
  {
    icon: Phone,
    title: "Telepon",
    content: "+62 21 1234 5678",
    description: "Sen-Jum 09:00-17:00 WIB",
  },
  {
    icon: MapPin,
    title: "Alamat",
    content: "Jakarta, Indonesia",
    description: "Kantor pusat kami",
  },
  {
    icon: Clock,
    title: "Jam Operasional",
    content: "24/7 Support Online",
    description: "Selalu siap membantu",
  },
]

const subjects = [
  { value: "general", label: "Pertanyaan Umum" },
  { value: "technical", label: "Masalah Teknis" },
  { value: "payment", label: "Pembayaran" },
  { value: "seller", label: "Menjadi Penjual" },
  { value: "product", label: "Produk" },
  { value: "account", label: "Akun" },
  { value: "other", label: "Lainnya" },
]

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Mock form submission
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Pesan berhasil dikirim!",
        description: "Kami akan merespons dalam 1x24 jam. Terima kasih!",
      })

      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      })
    } catch (error) {
      toast({
        title: "Gagal mengirim pesan",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Hubungi Kami</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Kami siap membantu Anda. Jangan ragu untuk menghubungi tim support kami yang berpengalaman.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Informasi Kontak</h2>
            <div className="grid gap-6">
              {contactInfo.map((info, index) => {
                const Icon = info.icon
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{info.title}</h3>
                          <p className="text-lg font-medium mb-1">{info.content}</p>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* FAQ Link */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Pertanyaan yang Sering Diajukan</h3>
              <p className="text-muted-foreground mb-4">
                Temukan jawaban cepat untuk pertanyaan umum di halaman FAQ kami.
              </p>
              <Button variant="outline" asChild>
                <a href="/faq">Lihat FAQ</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Kirim Pesan</CardTitle>
              <p className="text-muted-foreground">Isi form di bawah ini dan kami akan merespons secepatnya</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nama Lengkap *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="Masukkan email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subjek *</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleInputChange("subject", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih subjek pesan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Pesan *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Tulis pesan Anda di sini..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    "Mengirim..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Kirim Pesan
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
