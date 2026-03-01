import { Suspense } from "react"
import { notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductDetails } from "@/components/product/product-details"
import { ProductReviews } from "@/components/product/product-reviews"
import { RelatedProducts } from "@/components/product/related-products"
import { productService } from "@/lib/product-service"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

interface ExtendedProduct {
  file_size?: string
  format?: string
  pages?: number
  language?: string
  download_limit?: number
  license?: string
  telegram_enabled?: boolean
  telegram_plan_code?: string
  telegram_stars_price?: number
}

export default async function ProductPage({ params }: ProductPageProps) {
  noStore()
  const { id } = await params
  const product = await productService.getProduct(id)

  if (!product) {
    notFound()
  }

  // Fetch seller profile
  const seller = product.seller_id ? await productService.getSellerProfile(product.seller_id) : null

  // Transform product to match ProductDetails interface
  const transformedProduct = {
    id: product.id,
    title: product.title,
    description: product.description,
    longDescription: product.long_description || product.description,
    price: product.price,
    originalPrice: product.original_price,
    image: product.image_url || "/placeholder.svg",
    images: product.images || [product.image_url || "/placeholder.svg"],
    author: {
      name: seller?.business_name || seller?.name || "Seller",
      avatar: seller?.shop_logo || seller?.avatar_url || "/placeholder.svg?height=100&width=100",
      bio: seller?.bio || "Professional seller with quality products.",
      totalProducts: seller?.total_products || 0,
      totalSales: seller?.total_sales || 0,
    },
    rating: product.rating || 0,
    totalReviews: product.total_reviews || 0,
    sales: product.total_sales || 0,
    category: product.category,
    tags: product.tags || [],
    fileSize: (product as ExtendedProduct).file_size || "N/A",
    format: (product as ExtendedProduct).format || "Digital",
    pages: (product as ExtendedProduct).pages || 0,
    language: (product as ExtendedProduct).language || "N/A",
    lastUpdated: product.updated_at,
    downloadLimit: (product as ExtendedProduct).download_limit || -1,
    license: (product as ExtendedProduct).license || "Personal Use",
    livePreview: product.live_preview,
    seller_id: product.seller_id,
    delivery_method: product.delivery_method,
    telegram_enabled: (product as ExtendedProduct).telegram_enabled,
    telegram_plan_code: (product as ExtendedProduct).telegram_plan_code,
    telegram_stars_price: (product as ExtendedProduct).telegram_stars_price,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-8">
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
          <ProductDetails product={transformedProduct} />
        </Suspense>

        <div className="mt-16">
          <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
            <ProductReviews productId={product.id} />
          </Suspense>
        </div>

        <div className="mt-16">
          <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
            <RelatedProducts category={product.category} currentProductId={product.id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
