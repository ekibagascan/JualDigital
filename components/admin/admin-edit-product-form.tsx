"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

interface Product {
    id: string
    title: string
    description: string
    price: number
    category: string
    status: string
    image_url: string | null
    created_at: string
    updated_at: string
    seller_id: string
    author: string
    authorEmail: string
    authorAvatar: string | null
    totalSold: number
    revenue: number
    rating: number
    reviews: number
    variants: Array<{ name: string; price: number }>
}

interface AdminEditProductFormProps {
    productId: string
}

export function AdminEditProductForm({ productId }: AdminEditProductFormProps) {
    const router = useRouter()
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchProduct()
    }, [productId])

    const fetchProduct = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/admin/products/${productId}`)
            if (!response.ok) {
                throw new Error('Failed to fetch product')
            }

            const data = await response.json()
            setProduct(data.product)
        } catch (error) {
            console.error('Failed to fetch product:', error)
            setError('Gagal memuat data produk')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!product) return

        try {
            setSaving(true)

            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(product),
            })

            if (!response.ok) {
                throw new Error('Failed to update product')
            }

            toast({
                title: "Produk berhasil diperbarui",
                description: "Informasi produk telah disimpan.",
            })

            router.push('/admin/products')
        } catch (error) {
            console.error('Failed to update product:', error)
            toast({
                title: "Gagal memperbarui produk",
                description: "Terjadi kesalahan saat menyimpan perubahan.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleInputChange = (field: keyof Product, value: string | number) => {
        if (!product) return
        setProduct({ ...product, [field]: value })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Memuat data produk...</span>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-destructive mb-4">{error}</p>
                        <Button onClick={fetchProduct}>Coba Lagi</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!product) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-muted-foreground">Produk tidak ditemukan</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Button
                variant="outline"
                onClick={() => router.push('/admin/products')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar Produk
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Produk</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Judul Produk</Label>
                                <Input
                                    id="title"
                                    value={product.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="Masukkan judul produk"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Harga</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={product.price}
                                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                                    placeholder="Masukkan harga"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Kategori</Label>
                                <Select
                                    value={product.category}
                                    onValueChange={(value) => handleInputChange('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="akun">Akun</SelectItem>
                                        <SelectItem value="e-book">E-book</SelectItem>
                                        <SelectItem value="template">Template</SelectItem>
                                        <SelectItem value="software">Software</SelectItem>
                                        <SelectItem value="kursus">Kursus</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={product.status}
                                    onValueChange={(value) => handleInputChange('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Aktif</SelectItem>
                                        <SelectItem value="inactive">Tidak Aktif</SelectItem>
                                        <SelectItem value="pending">Menunggu Review</SelectItem>
                                        <SelectItem value="rejected">Ditolak</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                value={product.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Masukkan deskripsi produk"
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image_url">URL Gambar</Label>
                            <Input
                                id="image_url"
                                value={product.image_url || ''}
                                onChange={(e) => handleInputChange('image_url', e.target.value)}
                                placeholder="Masukkan URL gambar produk"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Simpan Perubahan
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/admin/products')}
                            >
                                Batal
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
} 