import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SellerStore } from "@/components/seller/seller-store"

export default function TokoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SellerStore />
      </main>
      <Footer />
    </div>
  )
}
