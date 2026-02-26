import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductsFilter } from "@/components/categories/products-filter"
import { ProductsList } from "@/components/categories/products-list"

export default function ProdukPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-2 sm:px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-4">Produk</h1>
                    <p className="text-muted-foreground">Jelajahi berbagai produk digital yang tersedia</p>
                </div>

                <div className="space-y-4">
                    <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded" />}>
                        <ProductsFilter />
                    </Suspense>
                    <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
                        <ProductsList />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </div>
    )
} 