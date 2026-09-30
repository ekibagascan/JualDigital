"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { Star, Download, BadgeIcon, Heart, ShoppingCart, Eye, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import type { ProductVariant } from "@/lib/product-service"
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
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [showVariantDialog, setShowVariantDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'cart' | 'buy' | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
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

  // Fetch variants on mount
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoadingVariants(true)
        const response = await fetch(`/api/products/${product.id}/variants`)
        const data = await response.json()

        if (response.ok && data.variants) {
          setVariants(data.variants || [])
          // Auto-select first variant if available
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0])
          }
        }
      } catch (error) {
        console.error('Error fetching variants:', error)
      } finally {
        setLoadingVariants(false)
      }
    }

    fetchVariants()
  }, [product.id])

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

  const proceedWithAction = async (action: 'cart' | 'buy') => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    const variantPrice = selectedVariant ? selectedVariant.price : product.price

    try {
      await addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        variant_name: selectedVariant?.name,
        title: product.title,
        price: variantPrice,
        image_url: product.image,
        seller_id: product.seller_id,
        quantity: 1,
      })

      if (action === 'cart') {
        toast({
          title: "Ditambahkan ke keranjang",
          description: `${product.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''} telah ditambahkan ke keranjang.`,
        })
      } else {
        router.push("/cart")
      }

      setShowVariantDialog(false)
      setSelectedVariant(variants.length > 0 ? variants[0] : null)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Gagal menambahkan ke keranjang",
        description: "Terjadi kesalahan saat menambahkan produk ke keranjang.",
        variant: "destructive",
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

    // If product has more than 1 variant, show dialog
    if (variants.length > 1) {
      setPendingAction('cart')
      setShowVariantDialog(true)
      return
    }

    // If 0 or 1 variant, proceed directly
    await proceedWithAction('cart')
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

    // If product has more than 1 variant, show dialog
    if (variants.length > 1) {
      setPendingAction('buy')
      setShowVariantDialog(true)
      return
    }

    // If 0 or 1 variant, proceed directly
    await proceedWithAction('buy')
  }

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMobile) {
      setShowPreview(!showPreview)
    }
  }

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="flex flex-row md:flex-col h-full">
        {/* Product Image — ~40% width on mobile (horizontal), full-width landscape on desktop */}
        <Link
          href={`/product/${product.id}`}
          className="relative block w-[40%] min-w-[40%] md:w-full md:min-w-0 shrink-0 self-stretch"
        >
          <div className="relative h-full min-h-[112px] md:min-h-0 md:aspect-[16/10] overflow-hidden">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 40vw, (max-width: 1200px) 33vw, 25vw"
            />

            {/* Badges */}
            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
              {product.isNew && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <BadgeIcon className="w-2.5 h-2.5 mr-0.5" />
                  Baru
                </Badge>
              )}
              {discountPercentage > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  -{discountPercentage}%
                </Badge>
              )}
            </div>

            {/* Hover actions (desktop) */}
            <div className="absolute top-1.5 right-1.5 hidden md:flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 bg-white/90 hover:bg-white"
                onClick={handleWishlist}
              >
                <Heart className={`w-3.5 h-3.5 ${isInWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
              </Button>

              {product.livePreview && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-white/90 hover:bg-white"
                  onClick={handlePreviewClick}
                >
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                </Button>
              )}
            </div>

            {/* Mobile Preview Overlay */}
            {showPreview && isMobile && product.livePreview && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="bg-white p-3 rounded-lg max-w-[90%] mx-2">
                  <h3 className="font-semibold text-sm mb-1">Preview</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Lihat preview produk ini
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <a href={product.livePreview} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Lihat
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

        <CardContent className="flex-1 min-w-0 p-2.5 sm:p-3 flex flex-col justify-between gap-1.5">
          <div className="space-y-0.5 min-w-0">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              <Link href={`/product/${product.id}`} className="hover:text-primary">
                {product.title}
              </Link>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              oleh{" "}
              <Link
                href={`/toko/${product.seller_id}`}
                className="hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {sellerName || product.author}
              </Link>
            </p>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{product.rating}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Download className="w-3 h-3" />
                <span>{product.sales.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 mt-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm text-primary">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="text-[10px] text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Icon cart + primary buy — saves space, keeps both actions */}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 shrink-0 px-0 bg-transparent"
                onClick={handleAddToCart}
                aria-label="Tambah ke keranjang"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-8 flex-1 text-xs px-2" onClick={handleBuyNow}>
                Beli Sekarang
              </Button>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Variant Selection Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pilih Varian</DialogTitle>
            <DialogDescription>
              Pilih varian untuk {product.title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingVariants ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat varian...
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedVariant?.id === variant.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{variant.name}</div>
                        {variant.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {variant.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="font-bold text-primary">
                          {formatCurrency(variant.price)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVariantDialog(false)
                setPendingAction(null)
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (selectedVariant && pendingAction) {
                  proceedWithAction(pendingAction)
                }
              }}
              disabled={!selectedVariant || loadingVariants}
            >
              {pendingAction === 'cart' ? 'Tambah ke Keranjang' : 'Beli Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
