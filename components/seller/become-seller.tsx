"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Upload, DollarSign, Users, TrendingUp, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

const benefits = [
  {
    icon: Upload,
    title: "Upload Mudah",
    description: "Upload produk digital Anda dengan mudah dalam hitungan menit",
  },
  {
    icon: DollarSign,
    title: "Komisi Rendah",
    description: "Hanya 5% komisi untuk setiap penjualan yang berhasil",
  },
  {
    icon: Users,
    title: "Jangkauan Luas",
    description: "Akses ke ribuan pembeli potensial di seluruh Indonesia",
  },
  {
    icon: TrendingUp,
    title: "Analytics Detail",
    description: "Pantau performa penjualan dengan dashboard analytics lengkap",
  },
]

const steps = [
  {
    number: "1",
    title: "Daftar Sebagai Penjual",
    description: "Lengkapi profil dan verifikasi akun Anda",
  },
  {
    number: "2",
    title: "Upload Produk",
    description: "Upload produk digital dengan deskripsi yang menarik",
  },
  {
    number: "3",
    title: "Mulai Berjualan",
    description: "Produk Anda siap dijual dan mendapatkan penghasilan",
  },
]

export function BecomeSeller() {
  const [formData, setFormData] = useState({
    businessName: "",
    category: "",
    description: "",
    experience: "",
    motivation: "",
  })
  const { user } = useAuth()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk mendaftar sebagai penjual.",
        variant: "destructive",
      })
      return
    }

    // Redirect to detailed registration flow
    window.location.href = "/seller/register"
  }

  return (
    <div className="py-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            Mulai Jualan
            <span className="text-primary block">Produk Digital Anda</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Bergabung dengan ribuan penjual sukses di Jual Digital. Platform terpercaya untuk menjual produk digital
            dengan komisi rendah dan fitur lengkap.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/seller/register">
                Daftar Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#cara-kerja">Pelajari Cara Kerja</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Mengapa Pilih Jual Digital?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Platform yang dirancang khusus untuk kesuksesan penjual produk digital
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <div className="mb-4 flex justify-center">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cara Kerja</h2>
            <p className="text-lg text-muted-foreground">Mudah dalam 3 langkah sederhana</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {step.number}
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cerita Sukses Penjual</h2>
            <p className="text-lg text-muted-foreground">Bergabung dengan penjual sukses lainnya</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Ahmad Rizki",
                category: "E-book",
                earnings: "Rp 50 juta/bulan",
                story: "Dari hobi menulis menjadi penghasilan utama",
              },
              {
                name: "Sarah Design",
                category: "Template",
                earnings: "Rp 35 juta/bulan",
                story: "Menjual template design untuk ribuan customer",
              },
              {
                name: "Tech Academy",
                category: "Kursus Online",
                earnings: "Rp 75 juta/bulan",
                story: "Berbagi knowledge programming dengan ribuan siswa",
              },
            ].map((story, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{story.name}</h3>
                  <p className="text-primary font-medium mb-2">{story.earnings}</p>
                  <p className="text-sm text-muted-foreground mb-3">{story.category}</p>
                  <p className="text-sm italic">"{story.story}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section id="daftar-sekarang" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Daftar Sebagai Penjual</CardTitle>
                <p className="text-center text-muted-foreground">
                  Lengkapi form di bawah untuk memulai perjalanan Anda sebagai penjual
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="businessName">Nama Bisnis/Brand *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange("businessName", e.target.value)}
                      placeholder="Contoh: Ahmad Digital Store"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Kategori Produk Utama *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ebook">E-book</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="music">Musik & Audio</SelectItem>
                        <SelectItem value="software">Software & Tools</SelectItem>
                        <SelectItem value="course">Kursus Online</SelectItem>
                        <SelectItem value="document">Dokumen Bisnis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Deskripsi Bisnis Anda *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Ceritakan tentang bisnis dan produk yang akan Anda jual..."
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="experience">Pengalaman Anda</Label>
                    <Select
                      value={formData.experience}
                      onValueChange={(value) => handleInputChange("experience", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Berapa lama pengalaman Anda?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Pemula (&lt; 1 tahun)</SelectItem>
                        <SelectItem value="intermediate">Menengah (1-3 tahun)</SelectItem>
                        <SelectItem value="advanced">Mahir (3-5 tahun)</SelectItem>
                        <SelectItem value="expert">Expert (&gt; 5 tahun)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motivation">Motivasi Bergabung</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => handleInputChange("motivation", e.target.value)}
                      placeholder="Apa yang memotivasi Anda untuk bergabung dengan Jual Digital?"
                      rows={3}
                    />
                  </div>

                  {!user ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        Silakan login terlebih dahulu untuk mendaftar sebagai penjual
                      </p>
                      <Button asChild>
                        <Link href="/login?redirect=/seller/register">Login Sekarang</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button type="submit" className="w-full" size="lg">
                      Kirim Aplikasi
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground text-center">
                    Dengan mendaftar, Anda menyetujui{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      Syarat &amp; Ketentuan Penjual
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
