import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HelpCenter } from "@/components/help/help-center"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <HelpCenter />
      </main>
      <Footer />
    </div>
  )
}
