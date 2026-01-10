import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/home/hero-section"
import { ProductsFilter } from "@/components/categories/products-filter"
import { ProductsList } from "@/components/categories/products-list"
import { Suspense } from "react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Semua Produk</h1>
            <p className="text-muted-foreground">Jelajahi berbagai produk digital yang tersedia</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-4 lg:gap-8">
            <div className="lg:col-span-1">
              <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
                <ProductsFilter />
              </Suspense>
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
