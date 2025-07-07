"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Grid, List } from "lucide-react"
import { ProductCard } from "@/components/product/product-card"
import { productService, type Product, SellerProfile, ProductService } from "@/lib/product-service"

// 👇 add near the top of the file, before `interface ProductsListProps`
type SearchParams = {
  sort?: string
  price_min?: string
  price_max?: string
  rating?: string
}

const EMPTY_PARAMS: SearchParams = Object.freeze({})

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

interface ProductsListProps {
  category?: string
  searchParams?: SearchParams
}

export function ProductsList({ category, searchParams = EMPTY_PARAMS }: ProductsListProps) {
  const { sort, price_min, price_max, rating } = searchParams
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState(sort || "popular")
  const [products, setProducts] = useState<Product[]>([])
  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProductsAndSellers = async () => {
      try {
        setLoading(true)
        const fetchedProducts = await productService.getProducts({
          category,
          limit: 50, // Adjust as needed
        })
        setProducts(fetchedProducts)
        // Batch fetch sellers
        const uniqueSellerIds = Array.from(new Set(fetchedProducts.map(p => p.seller_id)))
        const sellerNames = await ProductService.fetchSellerNames(uniqueSellerIds)
        setSellerNameMap(sellerNames)
      } catch (error) {
        console.error('Error fetching products or sellers:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProductsAndSellers()
  }, [category])

  useEffect(() => {
    let filteredProducts = [...products]

    if (price_min) {
      const min = Number.parseInt(price_min)
      filteredProducts = filteredProducts.filter((p) => p.price >= min)
    }

    if (price_max) {
      const max = Number.parseInt(price_max)
      filteredProducts = filteredProducts.filter((p) => p.price <= max)
    }

    if (rating) {
      const minRating = Number.parseFloat(rating)
      filteredProducts = filteredProducts.filter((p) => (p.rating || 0) >= minRating)
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "price-low":
        filteredProducts.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filteredProducts.sort((a, b) => b.price - a.price)
        break
      case "rating":
        filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "popular":
      default:
        filteredProducts.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
        break
    }

    setProducts(filteredProducts)
  }, [price_min, price_max, rating, sortBy])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        </div>
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Menampilkan {products.length} produk
            {category && ` dalam kategori ${category}`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Urutkan berdasarkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Paling Populer</SelectItem>
              <SelectItem value="newest">Terbaru</SelectItem>
              <SelectItem value="price-low">Harga Terendah</SelectItem>
              <SelectItem value="price-high">Harga Tertinggi</SelectItem>
              <SelectItem value="rating">Rating Tertinggi</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
          <p className="text-muted-foreground mb-6">Coba ubah filter atau jelajahi kategori lain</p>
          <Button asChild>
            <a href="/categories">Lihat Semua Kategori</a>
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {products.map((product) => {
            return (
              <ProductCard
                key={product.id}
                product={transformProduct(product)}
                sellerName={sellerNameMap[product.seller_id] || "Seller"}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex justify-center pt-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled>
              Sebelumnya
            </Button>
            <Button variant="default">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
            <span className="px-2">...</span>
            <Button variant="outline">10</Button>
            <Button variant="outline">Selanjutnya</Button>
          </div>
        </div>
      )}
    </div>
  )
}
