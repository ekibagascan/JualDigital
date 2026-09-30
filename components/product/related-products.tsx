"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product/product-card"
import { productService, type Product } from "@/lib/product-service"
import { PRODUCT_GRID_CLASS } from "@/lib/utils"

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
})

interface RelatedProductsProps {
  category: string
  currentProductId: string
}

export function RelatedProducts({ category, currentProductId }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true)
        const relatedProducts = await productService.getRelatedProducts(category, currentProductId, 4)
        setProducts(relatedProducts)
      } catch (error) {
        console.error('Error fetching related products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedProducts()
  }, [category, currentProductId])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Produk Terkait</h2>
        <div className={PRODUCT_GRID_CLASS}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted aspect-[3/4] rounded-lg mb-2"></div>
              <div className="space-y-1.5">
                <div className="h-3.5 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Produk Terkait</h2>

      <div className={PRODUCT_GRID_CLASS}>
        {products.map((product) => (
          <ProductCard key={product.id} product={transformProduct(product)} />
        ))}
      </div>
    </div>
  )
}
