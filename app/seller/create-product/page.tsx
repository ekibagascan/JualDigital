import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CreateProductForm } from "@/components/seller/create-product-form"

export default function CreateProductPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Tambah Produk Baru</h1>
            <p className="text-muted-foreground">Lengkapi informasi produk digital Anda</p>
          </div>
          <CreateProductForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
