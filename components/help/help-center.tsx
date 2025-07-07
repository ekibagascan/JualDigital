"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Search, Book, CreditCard, Users, Settings, ShoppingCart, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const categories = [
  {
    icon: ShoppingCart,
    title: "Pembelian & Pembayaran",
    description: "Cara berbelanja, metode pembayaran, dan masalah transaksi",
    articles: [
      "Cara membeli produk digital",
      "Metode pembayaran yang tersedia",
      "Masalah dengan pembayaran",
      "Cara mengunduh produk setelah pembelian",
      "Kebijakan pengembalian dana",
    ],
  },
  {
    icon: Users,
    title: "Menjadi Penjual",
    description: "Panduan lengkap untuk mulai berjualan di platform",
    articles: [
      "Cara mendaftar sebagai penjual",
      "Upload produk digital",
      "Mengatur harga dan deskripsi",
      "Mengelola pesanan dan pelanggan",
      "Mencairkan penghasilan",
    ],
  },
  {
    icon: Settings,
    title: "Pengaturan Akun",
    description: "Kelola profil, keamanan, dan preferensi akun Anda",
    articles: [
      "Mengubah informasi profil",
      "Mengatur password dan keamanan",
      "Notifikasi email",
      "Menghapus akun",
      "Verifikasi akun",
    ],
  },
  {
    icon: FileText,
    title: "Produk Digital",
    description: "Informasi tentang jenis produk, lisensi, dan penggunaan",
    articles: [
      "Jenis produk digital yang dijual",
      "Lisensi penggunaan produk",
      "Format file yang didukung",
      "Masalah download atau file rusak",
      "Cara menggunakan produk yang dibeli",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Invoices",
    description: "Tagihan, invoice, dan riwayat transaksi",
    articles: [
      "Melihat riwayat pembelian",
      "Download invoice",
      "Masalah dengan tagihan",
      "Perpajakan dan PPN",
      "Bukti pembayaran",
    ],
  },
  {
    icon: Book,
    title: "Kebijakan & Legal",
    description: "Syarat ketentuan, privasi, dan kebijakan platform",
    articles: [
      "Syarat dan ketentuan",
      "Kebijakan privasi",
      "Kebijakan hak cipta",
      "Laporan pelanggaran",
      "Dispute resolution",
    ],
  },
]

const popularArticles = [
  "Cara membeli produk digital pertama kali",
  "Panduan lengkap menjadi penjual sukses",
  "Metode pembayaran yang aman dan mudah",
  "Cara mengatasi masalah download produk",
  "Kebijakan pengembalian dana",
  "Tips meningkatkan penjualan produk digital",
]

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Search query:", searchQuery)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Pusat Bantuan</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Temukan jawaban untuk pertanyaan Anda atau hubungi tim support kami
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="search"
              placeholder="Cari artikel bantuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>
        </form>
      </div>

      {/* Popular Articles */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Artikel Populer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Book className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm">{article}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {categories.map((category, index) => {
          const Icon = category.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.articles.slice(0, 4).map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <div className="flex items-center gap-2 text-sm hover:text-primary transition-colors cursor-pointer">
                        <ArrowRight className="h-3 w-3" />
                        {article}
                      </div>
                    </li>
                  ))}
                  {category.articles.length > 4 && (
                    <li className="text-sm text-primary font-medium cursor-pointer">Lihat semua artikel →</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contact Support */}
      <Card className="text-center">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Tidak menemukan jawaban?</h2>
          <p className="text-muted-foreground mb-6">Tim support kami siap membantu Anda 24/7</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/contact">Hubungi Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/faq">Lihat FAQ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
