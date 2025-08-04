import { WithdrawalManagement } from "@/components/seller/withdrawal-management"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function WithdrawalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <WithdrawalManagement />
      </main>
      <Footer />
    </div>
  )
}
