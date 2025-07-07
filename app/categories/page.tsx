import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CategoriesGrid } from "@/components/categories/categories-grid"
import { ProductsFilter } from "@/components/categories/products-filter"
import { ProductsList } from "@/components/categories/products-list"

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Semua Kategori</h1>
          <p className="text-muted-foreground">Jelajahi berbagai kategori produk digital yang tersedia</p>
        </div>

        <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded" />}>
          <CategoriesGrid />
        </Suspense>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Semua Produk</h2>
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <ProductsFilter />
            </div>
            <div className="lg:col-span-3">
              <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
                <ProductsList />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
