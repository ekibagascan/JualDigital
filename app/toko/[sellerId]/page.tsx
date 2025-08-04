import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { StorePage } from "@/components/store/store-page"

interface StorePageProps {
    params: {
        sellerId: string
    }
}

export default function TokoPage({ params }: StorePageProps) {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                <StorePage sellerId={params.sellerId} />
            </main>
            <Footer />
        </div>
    )
} 