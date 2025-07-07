import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CheckCircle, Clock, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ApplicationSubmittedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Aplikasi Berhasil Dikirim!</h1>
            <p className="text-lg text-muted-foreground">
              Terima kasih telah mendaftar sebagai penjual di Jual Digital. Aplikasi Anda sedang dalam proses review.
            </p>
          </div>

          <div className="grid gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Clock className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">Proses Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Tim kami akan meninjau aplikasi Anda dalam 1-2 hari kerja
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Mail className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">Notifikasi Email</h3>
                    <p className="text-sm text-muted-foreground">
                      Kami akan mengirim update status aplikasi ke email Anda
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Langkah Selanjutnya</h2>
            <div className="text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-sm">Tunggu email konfirmasi dari tim kami</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-sm">Jika disetujui, Anda akan mendapat akses ke dashboard penjual</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-sm">Mulai upload produk digital pertama Anda</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Button asChild>
              <a href="/">
                Kembali ke Beranda
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">
                Ada pertanyaan?{" "}
                <a href="/contact" className="text-primary hover:underline">
                  Hubungi support kami
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
