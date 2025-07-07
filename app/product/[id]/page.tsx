import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductDetails } from "@/components/product/product-details"
import { ProductReviews } from "@/components/product/product-reviews"
import { RelatedProducts } from "@/components/product/related-products"
import { productService } from "@/lib/product-service"

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProductPage({ params }: ProductPageProps) {
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
      avatar: seller?.avatar_url || "/placeholder.svg?height=100&width=100",
      bio: seller?.bio || "Professional seller with quality products.",
      totalProducts: seller?.total_products || 0,
      totalSales: seller?.total_sales || 0,
    },
    rating: product.rating || 0,
    totalReviews: product.total_reviews || 0,
    sales: product.total_sales || 0,
    category: product.category,
    tags: product.tags || [],
    fileSize: "N/A",
    format: "Digital",
    pages: 0,
    language: "N/A",
    lastUpdated: product.updated_at,
    downloadLimit: 3,
    license: "Personal Use",
    livePreview: product.live_preview,
    seller_id: product.seller_id,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
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
