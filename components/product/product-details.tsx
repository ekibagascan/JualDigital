"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Star, Download, FileText, Globe, Shield, Heart, Share2, Eye } from "lucide-react"
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
  }
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(true)
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useSupabaseWishlist()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoadingVariants(true)
        const response = await fetch(`/api/products/${product.id}/variants`)
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
        description: "Silakan login terlebih dahulu untuk menambahkan ke keranjang.",
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

    console.log('Product data for cart:', {
      product_id: product.id,
      variant_id: selectedVariant?.id,
      title: product.title,
      variant_name: selectedVariant?.name,
      price: currentPrice,
      image_url: product.image,
      seller_id: product.seller_id,
      quantity: 1,
    })

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
        description: `${product.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} telah ditambahkan ke keranjang Anda.`,
      })
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Gagal menambahkan ke keranjang",
        description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
        variant: "destructive",
      })
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
      window.location.href = "/cart"
    } catch (error) {
      console.error('Error adding to cart for buy now:', error)
      toast({
        title: "Gagal menambahkan ke keranjang",
        description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
        variant: "destructive",
      })
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
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
          <Image
            src={product.images[selectedImage] || product.image}
            alt={product.title}
            fill
            className="object-cover"
          />
          {mounted && product.livePreview && (
            <div className="absolute top-4 right-4">
              <Button size="sm" variant="secondary" asChild>
                <a href={product.livePreview} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnail Images */}
        {mounted && product.images.length > 1 && (
          <div className="flex gap-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
              >
                <Image src={image} alt={`${product.title} ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
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
      <div className="lg:col-span-2">
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
