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
import { ArrowLeft, Camera, Save, Store, Link2, Copy, Check, ExternalLink, Loader2 } from "lucide-react"
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

    // Slug / Store Link state
    const [slugData, setSlugData] = useState({
        slug: "",
        originalSlug: "",
        storeUrl: "",
        suggestedSlug: "",
    })
    const [slugLoading, setSlugLoading] = useState(false)
    const [slugSaving, setSlugSaving] = useState(false)
    const [slugError, setSlugError] = useState("")
    const [slugCopied, setSlugCopied] = useState(false)

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
            loadSlugData()
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

    const loadSlugData = async () => {
        setSlugLoading(true)
        try {
            const response = await fetch('/api/seller/slug')
            if (response.ok) {
                const data = await response.json()
                setSlugData({
                    slug: data.slug || '',
                    originalSlug: data.slug || '',
                    storeUrl: data.storeUrl || '',
                    suggestedSlug: data.suggestedSlug || '',
                })
            }
        } catch (error) {
            console.error('Error loading slug data:', error)
        } finally {
            setSlugLoading(false)
        }
    }

    const handleSlugSave = async () => {
        const slug = slugData.slug.toLowerCase().trim()
        if (!slug) {
            setSlugError('Slug tidak boleh kosong')
            return
        }
        if (slug.length < 3) {
            setSlugError('Slug minimal 3 karakter')
            return
        }
        if (slug.length > 30) {
            setSlugError('Slug maksimal 30 karakter')
            return
        }
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            setSlugError('Hanya huruf kecil, angka, dan strip (-)')
            return
        }

        setSlugSaving(true)
        setSlugError('')
        try {
            const response = await fetch('/api/seller/slug', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            })
            const data = await response.json()

            if (!response.ok) {
                setSlugError(data.error || 'Gagal menyimpan')
                return
            }

            setSlugData(prev => ({
                ...prev,
                slug: data.slug,
                originalSlug: data.slug,
                storeUrl: data.storeUrl,
            }))

            toast({
                title: "Link toko berhasil diperbarui",
                description: `Toko Anda sekarang bisa diakses di ${data.storeUrl}`,
            })
        } catch (error) {
            console.error('Error saving slug:', error)
            setSlugError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setSlugSaving(false)
        }
    }

    const handleCopyLink = async () => {
        const url = slugData.storeUrl || `https://jualdigital.id/${slugData.slug}`
        try {
            await navigator.clipboard.writeText(url)
            setSlugCopied(true)
            toast({
                title: "Link berhasil disalin",
                description: url,
            })
            setTimeout(() => setSlugCopied(false), 2000)
        } catch {
            toast({
                title: "Gagal menyalin",
                description: "Silakan salin secara manual",
                variant: "destructive",
            })
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
                            <TabsTrigger value="shop-link">Link Toko</TabsTrigger>
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

                        {/* Shop Link Tab */}
                        <TabsContent value="shop-link">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Link2 className="h-5 w-5" />
                                        Link Toko
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Buat link pendek untuk toko Anda yang bisa dibagikan ke media sosial
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    {slugLoading ? (
                                        <div className="flex items-center gap-2 py-4">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-muted-foreground">Memuat...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Current store link */}
                                            {slugData.originalSlug && (
                                                <div className="p-4 bg-muted/50 rounded-lg border">
                                                    <p className="text-sm font-medium mb-2">Link Toko Anda Saat Ini</p>
                                                    <div className="flex items-center gap-2">
                                                        <code className="flex-1 px-3 py-2 bg-background rounded border text-sm font-mono break-all">
                                                            jualdigital.id/{slugData.originalSlug}
                                                        </code>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleCopyLink}
                                                        >
                                                            {slugCopied ? (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a href={slugData.storeUrl || `https://jualdigital.id/${slugData.originalSlug}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slug input */}
                                            <div className="space-y-2">
                                                <Label htmlFor="storeSlug">
                                                    {slugData.originalSlug ? 'Ubah Slug Toko' : 'Buat Slug Toko'}
                                                </Label>
                                                <div className="flex items-center gap-0">
                                                    <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground whitespace-nowrap">
                                                        jualdigital.id/
                                                    </span>
                                                    <Input
                                                        id="storeSlug"
                                                        value={slugData.slug}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                                            setSlugData(prev => ({ ...prev, slug: val }))
                                                            setSlugError('')
                                                        }}
                                                        placeholder={slugData.suggestedSlug || 'nama-toko-anda'}
                                                        className="rounded-l-none"
                                                        maxLength={30}
                                                    />
                                                </div>
                                                {slugError && (
                                                    <p className="text-sm text-destructive">{slugError}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Huruf kecil, angka, dan strip (-). Minimal 3, maksimal 30 karakter.
                                                </p>
                                            </div>

                                            {/* Preview */}
                                            {slugData.slug && (
                                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Preview</p>
                                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                                                        jualdigital.id/{slugData.slug}
                                                    </p>
                                                </div>
                                            )}

                                            <Button
                                                type="button"
                                                onClick={handleSlugSave}
                                                disabled={slugSaving || !slugData.slug || slugData.slug === slugData.originalSlug}
                                            >
                                                {slugSaving ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Menyimpan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Simpan Link Toko
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
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