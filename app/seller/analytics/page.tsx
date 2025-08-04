import { SellerAnalytics } from "@/components/seller/seller-analytics"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function SellerAnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SellerAnalytics />
      </main>
      <Footer />
    </div>
  )
}
