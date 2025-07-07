import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BecomeSeller } from "@/components/seller/become-seller"

export default function MulaiJualanPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <BecomeSeller />
      </main>
      <Footer />
    </div>
  )
}
