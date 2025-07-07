"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const faqData = [
  {
    category: "Umum",
    questions: [
      {
        question: "Apa itu Jual Digital?",
        answer:
          "Jual Digital adalah marketplace produk digital terpercaya di Indonesia yang memungkinkan kreator untuk menjual dan pembeli untuk mendapatkan berbagai produk digital seperti e-book, template, musik, software, dan kursus online.",
      },
      {
        question: "Bagaimana cara mendaftar di Jual Digital?",
        answer:
          "Anda dapat mendaftar dengan mengklik tombol 'Daftar' di halaman utama, lalu mengisi informasi yang diperlukan seperti nama, email, dan password. Setelah itu, Anda akan menerima email konfirmasi untuk mengaktifkan akun.",
      },
      {
        question: "Apakah gratis untuk membuat akun?",
        answer:
          "Ya, mendaftar dan membuat akun di Jual Digital sepenuhnya gratis. Kami hanya mengenakan komisi 5% dari setiap penjualan yang berhasil untuk penjual.",
      },
    ],
  },
  {
    category: "Pembelian",
    questions: [
      {
        question: "Bagaimana cara membeli produk digital?",
        answer:
          "Cari produk yang Anda inginkan, klik produk tersebut, lalu klik 'Beli Sekarang' atau 'Tambah ke Keranjong'. Ikuti proses checkout dan lakukan pembayaran. Setelah pembayaran berhasil, Anda akan mendapatkan link download.",
      },
      {
        question: "Metode pembayaran apa saja yang tersedia?",
        answer:
          "Kami menerima berbagai metode pembayaran melalui Xendit, termasuk kartu kredit/debit, e-wallet (OVO, GoPay, DANA, LinkAja), dan transfer bank (BCA, Mandiri, BNI, BRI).",
      },
      {
        question: "Bagaimana cara mengunduh produk setelah pembelian?",
        answer:
          "Setelah pembayaran berhasil, Anda akan menerima email dengan link download. Anda juga dapat mengakses produk yang dibeli melalui halaman 'Pembelian Saya' di dashboard akun Anda.",
      },
      {
        question: "Berapa lama link download berlaku?",
        answer:
          "Link download berlaku selamanya, namun Anda memiliki batas download sebanyak 3 kali untuk setiap produk. Jika mengalami masalah, Anda dapat menghubungi support kami.",
      },
    ],
  },
  {
    category: "Penjualan",
    questions: [
      {
        question: "Bagaimana cara menjadi penjual di Jual Digital?",
        answer:
          "Kunjungi halaman 'Mulai Jualan', isi formulir aplikasi penjual dengan lengkap, dan tunggu persetujuan dari tim kami. Proses review biasanya memakan waktu 1-2 hari kerja.",
      },
      {
        question: "Jenis produk apa saja yang bisa dijual?",
        answer:
          "Anda dapat menjual berbagai produk digital seperti e-book, template design, musik dan audio, software, kursus online, dokumen bisnis, dan produk digital lainnya yang legal.",
      },
      {
        question: "Berapa komisi yang dikenakan?",
        answer:
          "Kami mengenakan komisi sebesar 5% dari setiap penjualan yang berhasil. Ini termasuk biaya pemrosesan pembayaran dan layanan platform.",
      },
      {
        question: "Kapan saya bisa menarik penghasilan?",
        answer:
          "Anda dapat mengajukan penarikan penghasilan setiap hari dengan minimal penarikan Rp 100,000. Dana akan ditransfer dalam 1-3 hari kerja setelah pengajuan disetujui.",
      },
    ],
  },
  {
    category: "Pembayaran & Refund",
    questions: [
      {
        question: "Apakah pembayaran di Jual Digital aman?",
        answer:
          "Ya, kami menggunakan gateway pembayaran Xendit yang telah tersertifikasi dan menggunakan enkripsi SSL untuk melindungi data pembayaran Anda.",
      },
      {
        question: "Bagaimana kebijakan pengembalian dana?",
        answer:
          "Anda dapat mengajukan pengembalian dana dalam 7 hari jika produk tidak sesuai deskripsi atau file rusak. Permintaan refund akan diproses dalam 3-7 hari kerja.",
      },
      {
        question: "Apakah ada PPN untuk pembelian?",
        answer:
          "Ya, sesuai regulasi, kami mengenakan PPN 11% untuk setiap transaksi. PPN sudah termasuk dalam total pembayaran yang ditampilkan.",
      },
    ],
  },
  {
    category: "Teknis",
    questions: [
      {
        question: "Format file apa saja yang didukung?",
        answer:
          "Kami mendukung berbagai format file seperti PDF, DOC, PPT, JPG, PNG, MP3, WAV, MP4, ZIP, dan format umum lainnya dengan ukuran maksimal 500MB per file.",
      },
      {
        question: "Bagaimana jika file produk rusak atau tidak bisa diunduh?",
        answer:
          "Jika mengalami masalah dengan file, hubungi support kami dengan menyertakan bukti pembelian. Kami akan membantu memperbaiki masalah atau memberikan penggantian file.",
      },
      {
        question: "Apakah bisa mengakses akun dari multiple perangkat?",
        answer:
          "Ya, Anda dapat mengakses akun dari berbagai perangkat. Namun untuk keamanan, pastikan selalu logout setelah menggunakan perangkat umum.",
      },
    ],
  },
]

export function FAQSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const filteredFAQ = faqData
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.questions.length > 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Temukan jawaban untuk pertanyaan yang sering diajukan tentang Jual Digital
        </p>

        {/* Search */}
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="search"
              placeholder="Cari pertanyaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="space-y-8">
        {filteredFAQ.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold">{category.category}</h2>
              <Badge variant="secondary">{category.questions.length}</Badge>
            </div>

            <div className="space-y-4">
              {category.questions.map((faq, faqIndex) => {
                const itemId = `${categoryIndex}-${faqIndex}`
                const isOpen = openItems.includes(itemId)

                return (
                  <Card key={faqIndex}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full p-6 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium pr-8">{faq.question}</h3>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6">
                          <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {searchQuery && filteredFAQ.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Tidak ditemukan pertanyaan yang cocok dengan pencarian "{searchQuery}"
          </p>
          <p className="text-sm text-muted-foreground">
            Coba gunakan kata kunci yang berbeda atau{" "}
            <a href="/contact" className="text-primary hover:underline">
              hubungi support kami
            </a>
          </p>
        </div>
      )}

      {/* Contact Support */}
      <Card className="mt-12 text-center">
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold mb-2">Masih ada pertanyaan?</h2>
          <p className="text-muted-foreground mb-6">Tim support kami siap membantu Anda</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Hubungi Support
            </a>
            <a
              href="/help"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Pusat Bantuan
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
