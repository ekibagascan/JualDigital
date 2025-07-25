"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Package,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Plus,
    Edit,
    BarChart3,
    CreditCard
} from "lucide-react"
import Link from "next/link"

export default function SellerDashboard() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalSales: 0,
        totalOrders: 0,
        totalRevenue: 0
    })
    const [recentProducts, setRecentProducts] = useState<Array<{ id: string; title: string; price: number; image_url?: string; status?: string; created_at?: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [profileRole, setProfileRole] = useState<string | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)

    useEffect(() => {
        const fetchProfileRole = async () => {
            setProfileLoading(true)
            if (user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                if (!error && data?.role) {
                    setProfileRole(data.role)
                } else {
                    setProfileRole(null)
                }
            } else {
                setProfileRole(null)
            }
            setProfileLoading(false)
        }
        fetchProfileRole()
    }, [user?.id])

    useEffect(() => {
        if (!loading && !profileLoading) {
            if (!user) {
                router.push('/login')
                return
            }

            if (!profileRole || profileRole.toLowerCase() !== 'seller') {
                // Do not redirect, just show a message
                return
            }

            loadSellerData()
        }
    }, [user, loading, profileRole, profileLoading, router])

    type SellerDashboardResponse = {
        stats: {
            totalProducts: number;
            totalSales: number;
            totalOrders: number;
            totalRevenue: number;
        };
        recentProducts: Array<{ id: string; title: string; price: number; image_url?: string; status?: string; created_at?: string }>;
    };
    const loadSellerData = async () => {
        try {
            const response = await fetch('/api/seller/dashboard')

            if (response.ok) {
                const data: SellerDashboardResponse = await response.json()
                setStats(data.stats)
                setRecentProducts(data.recentProducts || [])
            }
        } catch (error: unknown) {
            console.error('Error loading seller data:', error instanceof Error ? error.message : error)
        } finally {
            setIsLoading(false)
        }
    }

    if (loading || isLoading || profileLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading seller dashboard...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    if (!profileRole || profileRole.toLowerCase() !== 'seller') {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Akses Terbatas</h2>
                <p className="text-muted-foreground mb-8">Anda perlu menjadi penjual untuk mengakses halaman ini.</p>
                <Button asChild>
                    <Link href="/mulai-jualan">Daftar Sebagai Penjual</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Toko Saya</h1>
                <p className="text-muted-foreground">Kelola produk dan lihat performa toko Anda</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalProducts}</div>
                        <p className="text-xs text-muted-foreground">Produk aktif</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Pesanan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendapatan</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rp {stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total pendapatan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pertumbuhan</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12%</div>
                        <p className="text-xs text-muted-foreground">Bulan ini</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Tambah Produk
                        </CardTitle>
                        <CardDescription>
                            Buat produk baru untuk dijual
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/seller/create-product">
                            <Button className="w-full">
                                Buat Produk Baru
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Kelola Produk
                        </CardTitle>
                        <CardDescription>
                            Edit dan kelola produk Anda
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/seller/products">
                            <Button variant="outline" className="w-full">
                                Lihat Semua Produk
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Analitik
                        </CardTitle>
                        <CardDescription>
                            Lihat performa toko Anda
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/seller/analytics">
                            <Button variant="outline" className="w-full">
                                Lihat Analitik
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Penarikan
                        </CardTitle>
                        <CardDescription>
                            Kelola pendapatan dan penarikan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/seller/withdrawals">
                            <Button variant="outline" className="w-full">
                                Kelola Penarikan
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Products */}
            {recentProducts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Produk Terbaru</CardTitle>
                        <CardDescription>
                            Produk yang baru-baru ini Anda buat atau edit
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentProducts.map((product: { id: string; title: string; price: number; image_url?: string; status?: string; created_at?: string }) => (
                                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        {product.image_url && (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="w-12 h-12 object-cover rounded-md"
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-medium">{product.title}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Rp {product.price?.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                        {product.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
} 