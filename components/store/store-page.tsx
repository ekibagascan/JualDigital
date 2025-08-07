"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, Star, Users, TrendingUp, Search, User, MapPin, Globe, Calendar, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { ProductCard } from "@/components/product/product-card"

interface StorePageProps {
    sellerId: string
}

interface SellerProfile {
    id: string
    name: string | null
    avatar_url: string | null
    bio: string | null
    business_name: string | null
    business_description: string | null
    shop_logo: string | null
    location: string | null
    website: string | null
    total_products?: number
    total_sales?: number
    rating?: number
    total_reviews?: number
    created_at: string
}

interface Product {
    id: string
    title: string
    description: string
    price: number
    image_url: string | null
    category: string
    status: string
    created_at: string
    sales?: number
    rating?: number
    reviews?: number
}

interface Review {
    id: string
    rating: number
    comment: string
    created_at: string
    user_name: string
    product_title: string
}

export function StorePage({ sellerId }: StorePageProps) {
    const router = useRouter()
    const [seller, setSeller] = useState<SellerProfile | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [sortBy, setSortBy] = useState("newest")
    const [showFullDescription, setShowFullDescription] = useState(false)

    useEffect(() => {
        loadStoreData()
    }, [sellerId])

    const loadStoreData = async () => {
        try {
            setLoading(true)

            // Load seller data with stats from API
            const response = await fetch(`/api/seller/${sellerId}`)

            if (!response.ok) {
                if (response.status === 404) {
                    router.push('/404')
                    return
                }
                throw new Error('Failed to load seller data')
            }

            const { seller: sellerData, stats } = await response.json()
            setSeller(sellerData)

            // Load seller's products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('seller_id', sellerId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })

            if (productsError) {
                console.error('Error loading products:', productsError)
            } else {
                setProducts(productsData || [])
            }

            // Load reviews for seller's products
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select(`
          id,
          rating,
          content,
          created_at,
          user_id,
          products!inner(
            title,
            seller_id
          )
        `)
                .eq('products.seller_id', sellerId)
                .order('created_at', { ascending: false })
                .limit(10)

            if (reviewsError) {
                console.error('Error loading reviews:', reviewsError)
            } else {
                // Transform reviews data and fetch user names
                const transformedReviews = await Promise.all((reviewsData || []).map(async (review: any) => {
                    let userName = 'Anonymous'
                    if (review.user_id) {
                        try {
                            const { data: userData } = await supabase.auth.admin.getUserById(review.user_id)
                            userName = userData?.user?.user_metadata?.name || userData?.user?.email || 'Anonymous'
                        } catch (error) {
                            console.error('Error fetching user data:', error)
                        }
                    }

                    return {
                        id: review.id,
                        rating: review.rating,
                        comment: review.content,
                        created_at: review.created_at,
                        user_name: userName,
                        product_title: review.products?.title || 'Unknown Product'
                    }
                }))
                setReviews(transformedReviews)
            }

        } catch (error) {
            console.error('Error loading store data:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "newest":
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            case "oldest":
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            case "price-high":
                return b.price - a.price
            case "price-low":
                return a.price - b.price
            case "name":
                return a.title.localeCompare(b.title)
            default:
                return 0
        }
    })

    const categories = Array.from(new Set(products.map(p => p.category)))

    // Transform store products to ProductCard format
    const transformProduct = (product: Product) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        originalPrice: undefined,
        image: product.image_url || "/placeholder.svg",
        author: seller?.business_name || seller?.name || "Seller",
        rating: product.rating || 0,
        sales: product.sales || 0,
        category: product.category,
        livePreview: undefined,
        seller_id: sellerId,
    })

    // Function to truncate description
    const truncateDescription = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength).trim() + '...'
    }

    // Get the description to display
    const getDescription = () => {
        const description = seller?.business_description || seller?.bio || "Penjual Digital Terpercaya"
        if (showFullDescription) {
            return description
        }
        return truncateDescription(description)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                {/* Store Header Skeleton */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="container mx-auto px-4 py-16">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <Skeleton className="w-32 h-32 rounded-full" />
                            <div className="text-center md:text-left flex-1 space-y-4">
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-6 w-48" />
                                <div className="flex flex-wrap gap-6">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Skeleton key={i} className="h-4 w-24" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-12 w-full mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-64" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Toko Tidak Ditemukan</h2>
                <p className="text-muted-foreground mb-8">Toko yang Anda cari tidak ditemukan atau telah dihapus.</p>
                <Button asChild>
                    <Link href="/">Kembali ke Beranda</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Store Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="container mx-auto px-4 py-16">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <Avatar className="w-32 h-32 border-4 border-white/20">
                            <AvatarImage
                                src={seller.shop_logo || seller.avatar_url || "/placeholder.svg"}
                                alt={seller.business_name || seller.name || "Store"}
                            />
                            <AvatarFallback className="text-4xl bg-white/20">
                                {(seller.business_name || seller.name || "S")[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-4xl font-bold mb-2">
                                {seller.business_name || seller.name || "Toko Digital"}
                            </h1>
                            <div className="mb-4">
                                <p className="text-xl opacity-90">
                                    {getDescription()}
                                </p>
                                {(seller?.business_description || seller?.bio) &&
                                    ((seller.business_description && seller.business_description.length > 150) ||
                                        (seller.bio && seller.bio.length > 150)) && (
                                        <button
                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                            className="text-sm text-white/80 hover:text-white underline mt-2"
                                        >
                                            {showFullDescription ? "Sembunyikan" : "Baca Selengkapnya"}
                                        </button>
                                    )}
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    <span>{products.length} Produk</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>{seller.total_sales || 0} Penjualan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4" />
                                    <span>
                                        {seller.rating || 0} ({seller.total_reviews || 0} ulasan)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>Bergabung {new Date(seller.created_at).getFullYear()}</span>
                                </div>
                            </div>
                            {(seller.location || seller.website) && (
                                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm">
                                    {seller.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span>{seller.location}</span>
                                        </div>
                                    )}
                                    {seller.website && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            <a
                                                href={seller.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline"
                                            >
                                                {seller.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="products" className="space-y-8">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="products">Produk ({products.length})</TabsTrigger>
                        <TabsTrigger value="reviews">Ulasan ({reviews.length})</TabsTrigger>
                    </TabsList>

                    {/* Products Tab */}
                    <TabsContent value="products" className="space-y-6">
                        {/* Filters */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                placeholder="Cari produk..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="w-full md:w-48">
                                            <SelectValue placeholder="Filter Kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Kategori</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-full md:w-48">
                                            <SelectValue placeholder="Urutkan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="newest">Terbaru</SelectItem>
                                            <SelectItem value="oldest">Terlama</SelectItem>
                                            <SelectItem value="price-high">Harga Tertinggi</SelectItem>
                                            <SelectItem value="price-low">Harga Terendah</SelectItem>
                                            <SelectItem value="name">Nama A-Z</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Products Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                            {sortedProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={transformProduct(product)}
                                    sellerName={seller?.business_name || seller?.name || "Seller"}
                                />
                            ))}
                        </div>

                        {sortedProducts.length === 0 && (
                            <div className="text-center py-16">
                                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Tidak ada produk ditemukan</h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || categoryFilter !== "all"
                                        ? "Coba ubah filter pencarian Anda"
                                        : "Toko ini belum memiliki produk"}
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Reviews Tab */}
                    <TabsContent value="reviews" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ulasan Pelanggan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {reviews.length > 0 ? (
                                    <div className="space-y-6">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="border-b pb-4 last:border-b-0">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-medium">{review.user_name}</span>
                                                            <div className="flex items-center">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-4 h-4 ${star <= review.rating
                                                                            ? "fill-yellow-400 text-yellow-400"
                                                                            : "text-gray-300"
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-sm text-muted-foreground">
                                                                {new Date(review.created_at).toLocaleDateString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-2">{review.product_title}</p>
                                                        <p className="text-sm">{review.comment}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Star className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Belum ada ulasan</h3>
                                        <p className="text-muted-foreground">Jadilah yang pertama memberikan ulasan untuk produk dari toko ini.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>


                </Tabs>
            </div>
        </div >
    )
} 