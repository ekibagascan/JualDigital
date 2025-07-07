import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PurchaseHistory } from "@/components/purchases/purchase-history"

export default function PurchasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Pembelian Saya</h1>
          <p className="text-muted-foreground">Riwayat pembelian dan download produk digital Anda</p>
        </div>
        <PurchaseHistory />
      </main>
      <Footer />
    </div>
  )
}
