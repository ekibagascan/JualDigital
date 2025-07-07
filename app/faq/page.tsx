import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { FAQSection } from "@/components/faq/faq-section"

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
