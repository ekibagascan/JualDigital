"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, Camera, Save, Store } from "lucide-react"
import Link from "next/link"

export default function SellerSettings() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [profileRole, setProfileRole] = useState<string | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)

    const [shopData, setShopData] = useState({
        businessName: "",
        businessDescription: "",
        category: "",
        website: "",
        socialMedia: "",
        shopLogo: "",
    })

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

            if (!profileRole) {
                // Still loading profile role, wait
                return
            }

            if (profileRole.toLowerCase() !== 'seller') {
                router.push('/seller/register')
                return
            }

            loadShopData()
        }
    }, [user, loading, profileRole, profileLoading, router])

    const loadShopData = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('business_name, business_description, business_category, website, social_media, shop_logo')
                .eq('id', user?.id)
                .single()

            if (!error && data) {
                setShopData({
                    businessName: data.business_name || "",
                    businessDescription: data.business_description || "",
                    category: data.business_category || "",
                    website: data.website || "",
                    socialMedia: data.social_media || "",
                    shopLogo: data.shop_logo || "",
                })
            }
        } catch (error) {
            console.error('Error loading shop data:', error)
        }
    }

    const handleShopDataChange = (field: string, value: string) => {
        setShopData((prev) => ({ ...prev, [field]: value }))
    }

    const handleShopLogoUpload = async (file: File) => {
        try {
            setIsLoading(true)

            // Create FormData for file upload
            const formData = new FormData()
            formData.append('file', file)

            // Upload via API endpoint
            const response = await fetch('/api/seller/upload-shop-logo', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed')
            }

            // Update shop data with new logo URL
            setShopData(prev => ({ ...prev, shopLogo: result.shopLogoUrl }))

            toast({
                title: "Logo toko berhasil diperbarui",
                description: "Logo toko Anda telah disimpan.",
            })
        } catch (error) {
            console.error('Shop logo upload error:', error)
            toast({
                title: "Gagal mengunggah logo",
                description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengunggah logo.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleShopDataSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    business_name: shopData.businessName,
                    business_description: shopData.businessDescription,
                    business_category: shopData.category,
                    website: shopData.website,
                    social_media: shopData.socialMedia,
                })
                .eq('id', user?.id)

            if (error) {
                throw new Error(error.message)
            }

            toast({
                title: "Pengaturan toko berhasil diperbarui",
                description: "Informasi toko Anda telah disimpan.",
            })
        } catch (error) {
            console.error('Shop settings update error:', error)
            toast({
                title: "Gagal memperbarui pengaturan",
                description: error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (loading || profileLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Memuat pengaturan...</p>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
                        <p className="text-muted-foreground mb-8">Silakan login untuk mengakses pengaturan toko</p>
                        <Button asChild>
                            <a href="/login">Login Sekarang</a>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    if (!profileRole || profileRole.toLowerCase() !== 'seller') {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <h2 className="text-2xl font-bold mb-4">Akses Ditolak</h2>
                        <p className="text-muted-foreground mb-8">Anda harus menjadi penjual untuk mengakses pengaturan toko</p>
                        <Button asChild>
                            <Link href="/seller/register">Daftar Sebagai Penjual</Link>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/seller">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali ke Dashboard
                            </Link>
                        </Button>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Pengaturan Toko</h1>
                        <p className="text-muted-foreground">Kelola informasi dan logo toko Anda</p>
                    </div>

                    <Tabs defaultValue="shop-info" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="shop-info">Informasi Toko</TabsTrigger>
                            <TabsTrigger value="shop-logo">Logo Toko</TabsTrigger>
                        </TabsList>

                        {/* Shop Info Tab */}
                        <TabsContent value="shop-info">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Store className="h-5 w-5" />
                                        Informasi Toko
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleShopDataSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="businessName">Nama Toko *</Label>
                                                <Input
                                                    id="businessName"
                                                    value={shopData.businessName}
                                                    onChange={(e) => handleShopDataChange("businessName", e.target.value)}
                                                    placeholder="Contoh: Ahmad Digital Store"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="category">Kategori Utama</Label>
                                                <Input
                                                    id="category"
                                                    value={shopData.category}
                                                    onChange={(e) => handleShopDataChange("category", e.target.value)}
                                                    placeholder="Contoh: Grafis, E-book, Software"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="businessDescription">Deskripsi Toko</Label>
                                            <Textarea
                                                id="businessDescription"
                                                value={shopData.businessDescription}
                                                onChange={(e) => handleShopDataChange("businessDescription", e.target.value)}
                                                placeholder="Ceritakan tentang toko dan produk Anda..."
                                                rows={4}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="website">Website</Label>
                                                <Input
                                                    id="website"
                                                    value={shopData.website}
                                                    onChange={(e) => handleShopDataChange("website", e.target.value)}
                                                    placeholder="https://website-anda.com"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="socialMedia">Media Sosial</Label>
                                                <Input
                                                    id="socialMedia"
                                                    value={shopData.socialMedia}
                                                    onChange={(e) => handleShopDataChange("socialMedia", e.target.value)}
                                                    placeholder="@username atau link profil"
                                                />
                                            </div>
                                        </div>

                                        <Button type="submit" disabled={isLoading}>
                                            <Save className="h-4 w-4 mr-2" />
                                            {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Shop Logo Tab */}
                        <TabsContent value="shop-logo">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Camera className="h-5 w-5" />
                                        Logo Toko
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-6">
                                            <Avatar className="w-24 h-24">
                                                <AvatarImage
                                                    src={shopData.shopLogo || "/placeholder.svg"}
                                                    alt="Shop logo"
                                                />
                                                <AvatarFallback className="text-2xl">
                                                    <Store className="h-8 w-8" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <input
                                                    type="file"
                                                    id="shop-logo-upload"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) handleShopLogoUpload(file)
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => document.getElementById('shop-logo-upload')?.click()}
                                                    disabled={isLoading}
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    {isLoading ? "Mengunggah..." : "Ubah Logo"}
                                                </Button>
                                                <p className="text-sm text-muted-foreground mt-2">JPG, PNG maksimal 2MB</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="font-semibold">Tips Logo Toko:</h3>
                                            <ul className="text-sm text-muted-foreground space-y-2">
                                                <li>• Gunakan logo yang jelas dan mudah dikenali</li>
                                                <li>• Ukuran yang disarankan: 200x200 pixel</li>
                                                <li>• Format yang didukung: JPG, PNG</li>
                                                <li>• Logo akan ditampilkan di halaman produk Anda</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    )
} 