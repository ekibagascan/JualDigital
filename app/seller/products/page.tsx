import { ProductManagement } from "@/components/seller/product-management"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function SellerProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ProductManagement />
      </main>
      <Footer />
    </div>
  )
}
