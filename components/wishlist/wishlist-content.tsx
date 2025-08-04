"use client"

import { useState, useEffect } from "react"
import { Heart, Trash2, ShoppingCart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface WishlistItem {
    id: string
    created_at: string
    products: {
        id: string
        title: string
        description: string
        price: number
        image_url?: string
        seller_id: string
        status: string
        total_sales: number
        total_reviews: number
        rating: number
    }
}

export function WishlistContent() {
    const { user } = useAuth()
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchWishlist = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('wishlist')
                    .select(`
            id,
            created_at,
            products (
              id,
              title,
              description,
              price,
              image_url,
              seller_id,
              status,
              total_sales,
              total_reviews,
              rating
            )
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching wishlist:', error)
                    toast({
                        title: "Error",
                        description: "Gagal memuat wishlist",
                        variant: "destructive",
                    })
                    return
                }

                // Transform the data to match our interface
                const transformedData = (data || []).map((item: {
                    id: string
                    created_at: string
                    products: WishlistItem['products'] | WishlistItem['products'][]
                }) => ({
                    id: item.id,
                    created_at: item.created_at,
                    products: Array.isArray(item.products) ? item.products[0] : item.products
                }))

                setWishlistItems(transformedData)
            } catch (error) {
                console.error('Error fetching wishlist:', error)
                toast({
                    title: "Error",
                    description: "Gagal memuat wishlist",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchWishlist()
    }, [user])

    const removeFromWishlist = async (wishlistId: string) => {
        try {
            const { error } = await supabase
                .from('wishlist')
                .delete()
                .eq('id', wishlistId)

            if (error) {
                throw error
            }

            setWishlistItems(prev => prev.filter(item => item.id !== wishlistId))
            toast({
                title: "Berhasil",
                description: "Produk dihapus dari wishlist",
            })
        } catch (error) {
            console.error('Error removing from wishlist:', error)
            toast({
                title: "Error",
                description: "Gagal menghapus dari wishlist",
                variant: "destructive",
            })
        }
    }

    const addToCart = async (product: WishlistItem['products']) => {
        try {
            // Add to cart logic here - for now just show success message
            console.log('Adding to cart:', product.id)
            toast({
                title: "Berhasil",
                description: "Produk ditambahkan ke keranjang",
            })
        } catch (error) {
            console.error('Error adding to cart:', error)
            toast({
                title: "Error",
                description: "Gagal menambahkan ke keranjang",
                variant: "destructive",
            })
        }
    }

    if (!user) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
                <p className="text-muted-foreground">Silakan login untuk melihat wishlist Anda</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat wishlist...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Wishlist Saya</h1>
                    <p className="text-muted-foreground">Produk yang Anda simpan untuk dibeli nanti</p>
                </div>
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-muted-foreground">
                        {wishlistItems.length} produk
                    </span>
                </div>
            </div>

            {wishlistItems.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Wishlist Kosong</h3>
                        <p className="text-muted-foreground mb-6">
                            Anda belum menambahkan produk ke wishlist
                        </p>
                        <Button asChild>
                            <Link href="/produk">
                                Jelajahi Produk
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                            <div className="aspect-video relative">
                                {item.products.image_url ? (
                                    <img
                                        src={item.products.image_url}
                                        alt={item.products.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <span className="text-muted-foreground">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFromWishlist(item.id)}
                                        className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg line-clamp-2">
                                    {item.products.title}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant={item.products.status === 'active' ? 'default' : 'secondary'}>
                                        {item.products.status === 'active' ? 'Tersedia' : 'Draft'}
                                    </Badge>
                                    {item.products.rating > 0 && (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <span>★</span>
                                            <span>{item.products.rating.toFixed(1)}</span>
                                            <span>({item.products.total_reviews})</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {item.products.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-bold">
                                            {formatCurrency(item.products.price)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={`/product/${item.products.id}`}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Detail
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => addToCart(item.products)}
                                            >
                                                <ShoppingCart className="h-4 w-4 mr-1" />
                                                Beli
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
} 