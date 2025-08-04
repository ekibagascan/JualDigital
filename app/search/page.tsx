"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductCard } from "@/components/product/product-card"
import { productService, ProductService, type Product } from "@/lib/product-service"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const searchResults = await productService.searchProducts(query)
        setProducts(searchResults)

        // Fetch seller names for the products
        if (searchResults.length > 0) {
          const uniqueSellerIds = Array.from(new Set(searchResults.map(p => p.seller_id)))
          const sellerNames = await ProductService.fetchSellerNames(uniqueSellerIds)
          setSellerNameMap(sellerNames)
        }
      } catch (error) {
        console.error('Error searching products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    searchProducts()
  }, [query])

  const transformProduct = (product: Product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    originalPrice: product.original_price,
    image: product.image_url || "/placeholder.svg",
    author: "Seller",
    rating: product.rating || 0,
    sales: product.total_sales || 0,
    category: product.category,
    livePreview: product.live_preview,
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Hasil Pencarian: "{query}"
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Mencari..." : `${products.length} produk ditemukan`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
            <p className="text-muted-foreground mb-6">
              Coba kata kunci lain atau jelajahi kategori produk
            </p>
            <a
              href="/produk"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Lihat Semua Produk
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={transformProduct(product)}
                sellerName={sellerNameMap[product.seller_id] || "Seller"}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
