import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SellerRegistrationFlow } from "@/components/seller/seller-registration-flow"

export default function SellerRegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SellerRegistrationFlow />
      </main>
      <Footer />
    </div>
  )
}
