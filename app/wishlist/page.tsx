import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { WishlistContent } from "@/components/wishlist/wishlist-content"

export default function WishlistPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-2 sm:px-4 py-8">
                <WishlistContent />
            </main>
            <Footer />
        </div>
    )
} 