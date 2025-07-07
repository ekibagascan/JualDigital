import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CartContent } from "@/components/cart/cart-content"

export default function CartPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Keranjang Belanja</h1>
          <p className="text-muted-foreground">Review produk yang akan Anda beli</p>
        </div>

        <CartContent />
      </main>
      <Footer />
    </div>
  )
}
