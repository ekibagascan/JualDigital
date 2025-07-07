"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/product/product-card"
import { ProductsFilter } from "@/components/categories/products-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { productService, type Product } from "@/lib/product-service"

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
})

interface SearchResultsProps {
  searchParams: {
    q?: string
    category?: string
    sort?: string
    price_min?: string
    price_max?: string
  }
}

export function SearchResults({ searchParams }: SearchResultsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [sortBy, setSortBy] = useState(searchParams.sort || "relevance")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true)
        const results = await productService.searchProducts(searchParams.q || "", 50)
        setProducts(results)
      } catch (error) {
        console.error('Error searching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [searchParams.q])

  if (loading) {
    return (
      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="h-96 animate-pulse bg-muted rounded" />
        </div>
        <div className="lg:col-span-3">
          <div className="h-96 animate-pulse bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <ProductsFilter />
      </div>

      <div className="lg:col-span-3 space-y-6">
        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Menampilkan {products.length} hasil
              {searchParams.q && ` untuk "${searchParams.q}"`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Paling Relevan</SelectItem>
                <SelectItem value="popular">Paling Populer</SelectItem>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="price-low">Harga Terendah</SelectItem>
                <SelectItem value="price-high">Harga Tertinggi</SelectItem>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">Tidak ada hasil ditemukan</h3>
            <p className="text-muted-foreground mb-6">
              Coba gunakan kata kunci yang berbeda atau jelajahi kategori lain
            </p>
            <Button asChild>
              <a href="/categories">Jelajahi Semua Kategori</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={transformProduct(product)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
