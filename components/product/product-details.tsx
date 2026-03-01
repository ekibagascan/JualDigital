"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Star, Download, FileText, Globe, Shield, Heart, Share2, Eye, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCart } from "@/components/providers/cart-provider"
import { useSupabaseWishlist } from "@/hooks/use-supabase-wishlist"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { HydrationSafe } from "@/components/ui/hydration-safe"
import type { ProductVariant } from "@/lib/product-service"
import { useRouter } from "next/navigation"
import { getTelegramBotUrlFromPayload, getTelegramStartPayload, isTelegramCheckoutProduct } from "@/lib/telegram-checkout"

// Function to format plain text description to HTML
function formatDescription(text: string): string {
  if (!text) return ""

  return text
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>')
    // Convert ✅ to styled checkmarks with proper spacing
    .replace(/✅/g, '<span class="text-green-500 mr-2">✅</span>')
    // Convert emojis to styled spans
    .replace(/🎨/g, '<span class="text-2xl">🎨</span>')
    .replace(/✨/g, '<span class="text-2xl">✨</span>')
    // Make "Fitur Utama:" bold
    .replace(/Fitur Utama:/g, '<strong class="text-lg font-semibold block mb-3">Fitur Utama:</strong>')
    // Make "⚠️ WAJIB SERTAKAN NOMOR WA SAAT CHECKOUT" stand out
    .replace(/⚠️ WAJIB SERTAKAN NOMOR WA SAAT CHECKOUT/g, '<div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4"><span class="text-yellow-800 font-bold">⚠️ WAJIB SERTAKAN NOMOR WA SAAT CHECKOUT</span></div>')
    // Add proper spacing and styling for bullet points
    .replace(/<br>✅/g, '<br><div class="flex items-start gap-2 mb-2"><span class="text-green-500 mt-1">✅</span><span>')
    .replace(/<br><br>/g, '</span></div><br>')
    // Clean up any remaining double line breaks
    .replace(/<br><br><br>/g, '<br><br>')
}

interface ProductDetailsProps {
  product: {
    id: string
    title: string
    description: string
    longDescription: string
    price: number
    originalPrice?: number
    image: string
    images: string[]
    livePreview?: string
    author: {
      name: string
      avatar: string
      bio: string
      totalProducts: number
      totalSales: number
    }
    rating: number
    totalReviews: number
    sales: number
    category: string
    tags: string[]
    fileSize: string
    format: string
    pages: number
    language: string
    lastUpdated: string
    downloadLimit: number
    license: string
    seller_id?: string
    delivery_method?: string
    telegram_enabled?: boolean
    telegram_plan_code?: string
    telegram_stars_price?: number
  }
}

export function ProductDetails({ product }: ProductDetailsProps) {

  // Filter out duplicate images to avoid showing thumbnail twice
  const getUniqueImages = () => {
    if (!product.images || product.images.length === 0) return [product.image]

    // Remove the thumbnail from images array if it exists there
    const filteredImages = product.images.filter(img => img !== product.image)

    // Return thumbnail first, then the rest of the unique images
    return [product.image, ...filteredImages]
  }

  const uniqueImages = getUniqueImages()
  const [selectedImage, setSelectedImage] = useState(0) // Always start with thumbnail (index 0)
  const [mounted, setMounted] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useSupabaseWishlist()
  const router = useRouter()
  const isTelegramCheckout = isTelegramCheckoutProduct(product)
  const telegramUrl = isTelegramCheckout
    ? getTelegramBotUrlFromPayload(getTelegramStartPayload(product))
    : null

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard navigation for image slider
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (uniqueImages.length <= 1) return

      if (event.key === 'ArrowLeft') {
        setSelectedImage(prev => prev === 0 ? uniqueImages.length - 1 : prev - 1)
      } else if (event.key === 'ArrowRight') {
        setSelectedImage(prev => prev === uniqueImages.length - 1 ? 0 : prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [uniqueImages.length])

  // Touch/swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || uniqueImages.length <= 1) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      setSelectedImage(prev => prev === uniqueImages.length - 1 ? 0 : prev + 1)
    } else if (isRightSwipe) {
      setSelectedImage(prev => prev === 0 ? uniqueImages.length - 1 : prev - 1)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoadingVariants(true)
        const response = await fetch(`/api/products/${product.id}/variants?t=${Date.now()}`, { cache: 'no-store' })
        const data = await response.json()

        if (response.ok) {
          setVariants(data.variants || [])
          // Set the first variant as default if available
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0])
          }
        } else {
          console.error('Failed to fetch variants:', data.error)
        }
      } catch (error) {
        console.error('Error fetching variants:', error)
      } finally {
        setLoadingVariants(false)
      }
    }

    fetchVariants()
  }, [product.id])

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const currentPrice = selectedVariant ? selectedVariant.price : product.price

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.",
        variant: "destructive",
      })
      return
    }

    if (variants.length > 0 && !selectedVariant) {
      toast({
        title: "Pilih varian",
        description: "Silakan pilih varian produk terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    try {
      await addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        title: product.title,
        variant_name: selectedVariant?.name,
        price: currentPrice,
        image_url: product.image,
        seller_id: product.seller_id,
        quantity: 1,
      })
      toast({
        title: "Ditambahkan ke keranjang",
        description: `${product.title} telah ditambahkan ke keranjang Anda.`,
      })
    } catch (error) {
      console.error('Error adding to cart:', error)
      // Don't show error toast if it's just a login requirement
      if (error instanceof Error && error.message.includes('login')) {
        toast({
          title: "Login diperlukan",
          description: "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Gagal menambahkan ke keranjang",
          description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
          variant: "destructive",
        })
      }
    }
  }

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk melakukan pembelian.",
        variant: "destructive",
      })
      return
    }

    if (variants.length > 0 && !selectedVariant) {
      toast({
        title: "Pilih varian",
        description: "Silakan pilih varian produk terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    try {
      await addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        title: product.title,
        variant_name: selectedVariant?.name,
        price: currentPrice,
        image_url: product.image,
        seller_id: product.seller_id,
        quantity: 1,
      })
      // Use router.push instead of window.location for better navigation
      router.push("/cart")
    } catch (error) {
      console.error('Error adding to cart for buy now:', error)
      // Don't show error toast if it's just a login requirement
      if (error instanceof Error && error.message.includes('login')) {
        toast({
          title: "Login diperlukan",
          description: "Silakan login terlebih dahulu untuk melakukan pembelian.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Gagal menambahkan ke keranjang",
          description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
          variant: "destructive",
        })
      }
    }
  }

  const handleWishlist = async () => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk menambahkan ke wishlist.",
        variant: "destructive",
      })
      return
    }

    const isWishlisted = isInWishlist(product.id)

    if (isWishlisted) {
      await removeFromWishlist(product.id)
      toast({
        title: "Dihapus dari wishlist",
        description: `${product.title} dihapus dari wishlist Anda.`,
      })
    } else {
      await addToWishlist(product.id)
      toast({
        title: "Ditambahkan ke wishlist",
        description: `${product.title} ditambahkan ke wishlist Anda.`,
      })
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: product.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link disalin",
        description: "Link produk telah disalin ke clipboard.",
      })
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">
      {/* Product Images */}
      <div className="space-y-4">
        <div
          className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted group cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={uniqueImages[selectedImage]}
            alt={product.title}
            fill
            className={`object-cover select-none transition-all duration-300 ${isZoomed ? 'scale-150' : 'scale-100'
              }`}
            priority={selectedImage === 0}
          />

          {/* Zoom Toggle Button */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isZoomed ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"} />
            </svg>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-4 left-16 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFullscreen ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
            </svg>
          </button>

          {/* Navigation Arrows */}
          {mounted && uniqueImages.length > 1 && (
            <>
              {/* Left Arrow */}
              <button
                onClick={() => setSelectedImage(selectedImage === 0 ? uniqueImages.length - 1 : selectedImage - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Right Arrow */}
              <button
                onClick={() => setSelectedImage(selectedImage === uniqueImages.length - 1 ? 0 : selectedImage + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label="Next image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image Counter */}
          {mounted && uniqueImages.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
              {selectedImage + 1} / {uniqueImages.length}
            </div>
          )}

          {/* Live Preview Button */}
          {mounted && product.livePreview ? (
            <div className="absolute top-4 right-4">
              <Button size="sm" variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <a href={product.livePreview} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" />
                  Live Preview
                </a>
              </Button>
            </div>
          ) : (
            <div className="absolute top-4 right-4">
              <Button size="sm" variant="outline" className="bg-white/90 hover:bg-white text-gray-700" disabled>
                <Eye className="w-4 h-4 mr-2" />
                No Preview
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnail Images */}
        {mounted && uniqueImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {uniqueImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
              >
                <Image src={image} alt={`${product.title} ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Dot Indicators */}
        {mounted && uniqueImages.length > 1 && (
          <div className="flex justify-center gap-2">
            {uniqueImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${selectedImage === index ? "bg-primary" : "bg-gray-300"
                  }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Live Preview Section */}
        {mounted && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Live Preview</h3>
                <p className="text-sm text-gray-600">
                  {product.livePreview
                    ? "See this product in action before you buy"
                    : "No live preview available for this product"
                  }
                </p>

              </div>
              {product.livePreview ? (
                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" asChild>
                  <a href={product.livePreview} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    View Live Demo
                  </a>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  <Eye className="w-4 h-4 mr-2" />
                  No Preview
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={product.images[selectedImage] || product.image}
                alt={product.title}
                fill
                className="object-contain"
                priority
              />

              {/* Close Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full"
                aria-label="Close fullscreen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Fullscreen Navigation Arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(selectedImage === 0 ? product.images.length - 1 : selectedImage - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full"
                    aria-label="Previous image"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setSelectedImage(selectedImage === product.images.length - 1 ? 0 : selectedImage + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full"
                    aria-label="Next image"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Fullscreen Image Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-lg font-medium">
                    {selectedImage + 1} / {product.images.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {mounted && product.originalPrice && (
              <Badge variant="destructive">-{discountPercentage}%</Badge>
            )}
            <Badge variant="outline">{product.category}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
          <p className="text-muted-foreground mb-4">{product.description}</p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.rating}</span>
              <span className="text-muted-foreground">({product.totalReviews} ulasan)</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{product.sales.toLocaleString("id-ID")} terjual</span>
            </div>
          </div>

          {/* Variant Selection */}
          {!loadingVariants && variants.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Pilih Varian:</h3>
              <div className="grid grid-cols-1 gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${selectedVariant?.id === variant.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{variant.name}</div>
                        {variant.description && (
                          <div className="text-sm text-muted-foreground">{variant.description}</div>
                        )}
                      </div>
                      <div className="font-bold text-primary">
                        {formatCurrency(variant.price)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(currentPrice)}
            </div>
            <HydrationSafe>
              {mounted && product.originalPrice && !selectedVariant && (
                <div className="text-xl text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice)}
                </div>
              )}
            </HydrationSafe>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button size="lg" variant="outline" onClick={handleWishlist}>
            <Heart className={`w-4 h-4 mr-2 ${mounted && isInWishlist(product.id) ? "fill-red-500 text-red-500" : ""}`} />
            <HydrationSafe fallback="Wishlist">
              {mounted && isInWishlist(product.id) ? "Wishlisted" : "Wishlist"}
            </HydrationSafe>
          </Button>
          <Button size="lg" variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan
          </Button>
        </div>

        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={variants.length > 0 && !selectedVariant}
          >
            <Download className="w-4 h-4 mr-2" />
            {variants.length > 0 && !selectedVariant ? "Pilih Varian" : "Tambah ke Keranjang"}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleBuyNow}
            disabled={variants.length > 0 && !selectedVariant}
          >
            {variants.length > 0 && !selectedVariant ? "Pilih Varian" : "Beli Sekarang"}
          </Button>
        </div>
        {isTelegramCheckout && (
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            disabled={!telegramUrl}
            asChild={!!telegramUrl}
          >
            {telegramUrl ? (
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                <Send className="w-4 h-4 mr-2" />
                Order via Telegram
              </a>
            ) : (
              <span>
                <Send className="w-4 h-4 mr-2" />
                Telegram belum dikonfigurasi
              </span>
            )}
          </Button>
        )}

        {/* Seller Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={product.author.avatar} />
                <AvatarFallback>{product.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{product.author.name}</h3>
                <p className="text-sm text-muted-foreground">{product.author.bio}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{product.author.totalProducts} produk</span>
                  <span>{product.author.totalSales} penjualan</span>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/toko/${product.seller_id}`}>Lihat Toko</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Detail Produk</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ukuran File:</span>
                <span className="ml-2">{product.fileSize}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>
                <span className="ml-2">{product.format}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Halaman:</span>
                <span className="ml-2">{product.pages}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Bahasa:</span>
                <span className="ml-2">{product.language}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Update Terakhir:</span>
                <span className="ml-2">{product.lastUpdated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Lisensi:</span>
                <span className="ml-2">{product.license}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Description Tabs */}
      <div className="lg:col-span-2 mt-8 lg:mt-0">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="description">Deskripsi</TabsTrigger>
            <TabsTrigger value="features">Fitur</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: formatDescription(product.longDescription) }} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="features" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Fitur Utama</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>Lisensi: {product.license || 'Personal Use'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>Download instan setelah pembayaran</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <span>Format: {product.format || 'Digital'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span>Bahasa: {product.language || 'Indonesia'}</span>
                  </li>
                  <HydrationSafe>
                    {mounted && product.downloadLimit > 0 && (
                      <li className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-red-500" />
                        <span>Limit download: {product.downloadLimit} kali</span>
                      </li>
                    )}
                  </HydrationSafe>
                  <HydrationSafe>
                    {mounted && product.downloadLimit === -1 && (
                      <li className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-green-500" />
                        <span>Download unlimited</span>
                      </li>
                    )}
                  </HydrationSafe>
                  <HydrationSafe>
                    {mounted && product.livePreview && (
                      <li className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span>Live preview tersedia</span>
                      </li>
                    )}
                  </HydrationSafe>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
