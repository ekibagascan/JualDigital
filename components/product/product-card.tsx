"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { Star, Download, BadgeIcon, Heart, ShoppingCart, Eye, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useCart } from "@/components/providers/cart-provider"
import { useSupabaseWishlist } from "@/hooks/use-supabase-wishlist"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Product {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number
  image: string
  author: string
  rating: number
  sales: number
  category: string
  isNew?: boolean
  livePreview?: string
  seller_id: string
}

interface ProductCardProps {
  product: Product
  sellerName?: string
}

export function ProductCard({ product, sellerName }: ProductCardProps) {
  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const [showPreview, setShowPreview] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useSupabaseWishlist()
  const router = useRouter()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
        description: `${product.title} dihapus dari wishlist.`,
      })
    } else {
      await addToWishlist(product.id)
      toast({
        title: "Ditambahkan ke wishlist",
        description: `${product.title} ditambahkan ke wishlist.`,
      })
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk menambahkan ke keranjang.",
        variant: "destructive",
      })
      return
    }

    try {
      await addItem({
        product_id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image,
        seller_id: product.seller_id,
        quantity: 1,
      })
      toast({
        title: "Ditambahkan ke keranjang",
        description: `${product.title} telah ditambahkan ke keranjang.`,
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

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk melakukan pembelian.",
        variant: "destructive",
      })
      return
    }

    try {
      await addItem({
        product_id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image,
        seller_id: product.seller_id,
        quantity: 1,
      })
      router.push("/cart")
    } catch (error) {
      console.error('Error adding to cart for buy now:', error)
      toast({
        title: "Gagal menambahkan ke keranjang",
        description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
        variant: "destructive",
      })
    }
  }

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMobile) {
      setShowPreview(!showPreview)
    }
  }

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Product Image with Link */}
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <Badge variant="secondary" className="text-xs">
                <BadgeIcon className="w-3 h-3 mr-1" />
                Baru
              </Badge>
            )}
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="text-xs">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Wishlist Button */}
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={handleWishlist}
            >
              <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
            </Button>

            {/* Preview Button */}
            {product.livePreview && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={handlePreviewClick}
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </Button>
            )}
          </div>

          {/* Mobile Preview Overlay */}
          {showPreview && isMobile && product.livePreview && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg max-w-sm mx-4">
                <h3 className="font-semibold mb-2">Preview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Lihat preview produk ini
                </p>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <a href={product.livePreview} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Lihat Preview
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPreview(false)}>
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <Link href={`/product/${product.id}`} className="block">
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {product.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">oleh {sellerName || product.author}</p>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{product.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3 text-muted-foreground" />
              <span>{product.sales.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={handleAddToCart}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Keranjang
            </Button>
            <Button size="sm" className="flex-1" onClick={handleBuyNow}>
              Beli Sekarang
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
