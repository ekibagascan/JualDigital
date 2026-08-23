import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MembershipFeed } from "@/components/memberships/membership-feed"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { productId: string }
}

export default function KomunitasPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <MembershipFeed productId={params.productId} />
      </main>
      <Footer />
    </div>
  )
}
