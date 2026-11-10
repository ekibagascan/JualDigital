import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-16">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">Akun telah dihapus</h1>
          <p className="text-muted-foreground">
            Akun Anda sudah dihapus secara permanen. Anda tidak bisa masuk lagi dengan akun tersebut.
          </p>
          <Button asChild>
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
