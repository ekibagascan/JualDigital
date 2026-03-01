"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
  seller_id: product.seller_id,
  delivery_method: product.delivery_method,
  tags: product.tags,
  telegram_enabled: product.telegram_enabled,
  telegram_plan_code: product.telegram_plan_code,
  telegram_stars_price: product.telegram_stars_price,
})

interface ProductsListProps {
  category?: string
}

export function ProductsList({ category }: ProductsListProps) {
  const searchParams = useSearchParams()
  const viewMode: "grid" | "list" = searchParams.get("view") === "list" ? "list" : "grid"
  const [products, setProducts] = useState<Product[]>([])
  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [, setTotalProducts] = useState(0)
  const itemsPerPage = 24

  useEffect(() => {
    const fetchProductsAndSellers = async () => {
      try {
        setLoading(true)
        setCurrentPage(1) // Reset to first page when filters change

        // Get filter parameters from URL
        const price_min = searchParams.get("price_min")
        const price_max = searchParams.get("price_max")
        const categories = searchParams.get("categories")
        const ratings = searchParams.get("ratings")
        const sort = searchParams.get("sort") || "popular"

        // Build filter object
        const filters: {
          category?: string
          limit?: number
          offset?: number
          price_min?: number
          price_max?: number
          categories?: string[]
          min_rating?: number
          sort?: string
        } = {
          category,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          sort,
        }

        // Add price filters
        if (price_min) filters.price_min = Number.parseInt(price_min)
        if (price_max) filters.price_max = Number.parseInt(price_max)

        // Add category filter
        if (categories) {
          const categoryList = categories.split(",")
          filters.categories = categoryList
        }

        // Add rating filter
        if (ratings) {
          const ratingList = ratings.split(",")
          const minRating = Math.min(...ratingList.map(r => Number.parseInt(r)))
          filters.min_rating = minRating
        }

        const fetchedProducts = await productService.getProducts(filters)
        setProducts(fetchedProducts)

        // Get total count for pagination
        const countFilters = { ...filters }
        delete countFilters.limit
        delete countFilters.offset
        const totalCount = await productService.getProductsCount(countFilters)
        setTotalProducts(totalCount)
        setTotalPages(Math.ceil(totalCount / itemsPerPage))

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
  }, [category, searchParams])

  // Separate useEffect for pagination changes
  useEffect(() => {
    if (currentPage > 1) {
      const fetchProductsAndSellers = async () => {
        try {
          setLoading(true)

          // Get filter parameters from URL
          const price_min = searchParams.get("price_min")
          const price_max = searchParams.get("price_max")
          const categories = searchParams.get("categories")
          const ratings = searchParams.get("ratings")
          const sort = searchParams.get("sort") || "popular"

          // Build filter object
          const filters: {
            category?: string
            limit?: number
            offset?: number
            price_min?: number
            price_max?: number
            categories?: string[]
            min_rating?: number
            sort?: string
          } = {
            category,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
            sort,
          }

          // Add price filters
          if (price_min) filters.price_min = Number.parseInt(price_min)
          if (price_max) filters.price_max = Number.parseInt(price_max)

          // Add category filter
          if (categories) {
            const categoryList = categories.split(",")
            filters.categories = categoryList
          }

          // Add rating filter
          if (ratings) {
            const ratingList = ratings.split(",")
            const minRating = Math.min(...ratingList.map(r => Number.parseInt(r)))
            filters.min_rating = minRating
          }

          const fetchedProducts = await productService.getProducts(filters)
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
    }
  }, [currentPage, category, searchParams])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generatePageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
          <p className="text-muted-foreground mb-6">Coba ubah filter atau jelajahi kategori lain</p>
          <Button asChild>
            <a href="/produk">Lihat Semua Produk</a>
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6" : "space-y-4"}>
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
      {products.length > 0 && totalPages > 1 && (
        <div className="flex justify-center pt-8">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Sebelumnya
            </Button>

            {generatePageNumbers().map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
