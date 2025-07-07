"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product/product-card"
import { productService, type Product, ProductService } from "@/lib/product-service"

// Transform Supabase product to match ProductCard interface
const transformProduct = (product: Product) => ({
  id: product.id,
  title: product.title,
  description: product.description,
  price: product.price,
  originalPrice: product.original_price,
  image: product.image_url || "/placeholder.svg",
  author: "Seller", // We'll need to fetch seller info separately
  rating: product.rating || 0,
  sales: product.total_sales || 0,
  category: product.category,
  livePreview: product.live_preview,
  isNew: true, // Mark as new for newest products
})

export function NewestProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProductsAndSellers = async () => {
      try {
        const newestProducts = await productService.getNewestProducts(4)
        setProducts(newestProducts)
        const uniqueSellerIds = Array.from(new Set(newestProducts.map(p => p.seller_id)))
        const sellerNames = await ProductService.fetchSellerNames(uniqueSellerIds)
        setSellerNameMap(sellerNames)
      } catch (error) {
        console.error('Error fetching newest products or sellers:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProductsAndSellers()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Produk Terbaru</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Produk digital terbaru yang baru saja ditambahkan
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Produk Terbaru</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Produk digital terbaru yang baru saja ditambahkan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={transformProduct(product)}
              sellerName={sellerNameMap[product.seller_id] || "Seller"}
            />
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline" asChild>
            <Link href="/categories">Lihat Semua Produk</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
