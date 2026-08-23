import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ServiceOrderDetail } from "@/components/services/service-order-detail"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { id: string }
}

export default function PesananJasaPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Detail Pesanan Jasa</h1>
        <ServiceOrderDetail orderId={params.id} />
      </main>
      <Footer />
    </div>
  )
}
