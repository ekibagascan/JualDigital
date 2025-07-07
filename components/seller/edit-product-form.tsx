"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Plus, Trash2, Save, ArrowLeft, LinkIcon, FileText, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ProductVariant {
  id: string
  name: string
  price: number
  description?: string
}

interface ProductData {
  id: string
  title: string
  description: string
  category: string
  price: number
  images: string[]
  tags: string[]
  variants: ProductVariant[]
  deliveryMethod: "file" | "link"
  fileUrl?: string
  downloadLink?: string
  status: "draft" | "published"
}

interface EditProductFormProps {
  productId: string
}

export function EditProductForm({ productId }: EditProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [newTag, setNewTag] = useState("")
  const [newVariant, setNewVariant] = useState({ name: "", price: 0, description: "" })

  // Mock data - in real app, fetch from API
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockProduct: ProductData = {
          id: productId,
          title: "E-book Digital Marketing Lengkap",
          description:
            "Panduan lengkap digital marketing untuk pemula hingga advanced. Berisi strategi, tips, dan case study yang telah terbukti efektif.",
          category: "ebook",
          price: 150000,
          images: [
            "/placeholder.svg?height=300&width=300&text=Product+Image+1",
            "/placeholder.svg?height=300&width=300&text=Product+Image+2",
          ],
          tags: ["digital marketing", "ebook", "bisnis", "online"],
          variants: [
            { id: "1", name: "Basic Edition", price: 150000, description: "E-book dasar" },
            { id: "2", name: "Premium Edition", price: 250000, description: "E-book + bonus template" },
          ],
          deliveryMethod: "file",
          fileUrl: "https://example.com/ebook.pdf",
          status: "published",
        }

        setProductData(mockProduct)
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat data produk",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleSave = async () => {
    if (!productData) return

    setSaving(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Berhasil",
        description: "Produk berhasil diperbarui",
      })

      router.push("/seller/products")
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan perubahan",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && productData && !productData.tags.includes(newTag.trim())) {
      setProductData({
        ...productData,
        tags: [...productData.tags, newTag.trim()],
      })
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    if (productData) {
      setProductData({
        ...productData,
        tags: productData.tags.filter((tag) => tag !== tagToRemove),
      })
    }
  }

  const addVariant = () => {
    if (newVariant.name.trim() && newVariant.price > 0 && productData) {
      const variant: ProductVariant = {
        id: Date.now().toString(),
        name: newVariant.name.trim(),
        price: newVariant.price,
        description: newVariant.description.trim() || undefined,
      }

      setProductData({
        ...productData,
        variants: [...productData.variants, variant],
      })

      setNewVariant({ name: "", price: 0, description: "" })
    }
  }

  const removeVariant = (variantId: string) => {
    if (productData) {
      setProductData({
        ...productData,
        variants: productData.variants.filter((v) => v.id !== variantId),
      })
    }
  }

  const updateVariant = (variantId: string, field: keyof ProductVariant, value: string | number) => {
    if (productData) {
      setProductData({
        ...productData,
        variants: productData.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
      })
    }
  }

  const removeImage = (imageIndex: number) => {
    if (productData) {
      setProductData({
        ...productData,
        images: productData.images.filter((_, index) => index !== imageIndex),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!productData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Produk tidak ditemukan</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <div className="flex items-center space-x-2">
          <Badge variant={productData.status === "published" ? "default" : "secondary"}>
            {productData.status === "published" ? "Dipublikasi" : "Draft"}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
          <TabsTrigger value="images">Gambar</TabsTrigger>
          <TabsTrigger value="variants">Varian</TabsTrigger>
          <TabsTrigger value="delivery">Pengiriman</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Produk</Label>
                <Input
                  id="title"
                  value={productData.title}
                  onChange={(e) => setProductData({ ...productData, title: e.target.value })}
                  placeholder="Masukkan judul produk"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  placeholder="Deskripsikan produk Anda"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={productData.category}
                    onValueChange={(value) => setProductData({ ...productData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ebook">E-book</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="kursus">Kursus Online</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="grafis">Grafis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Harga (Rp)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={productData.price}
                    onChange={(e) => setProductData({ ...productData, price: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tag</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {productData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tambah tag"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={productData.status === "published"}
                  onCheckedChange={(checked) =>
                    setProductData({ ...productData, status: checked ? "published" : "draft" })
                  }
                />
                <Label htmlFor="status">Publikasikan produk</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="mr-2 h-5 w-5" />
                Gambar Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Product ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-32 flex items-center justify-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload Gambar</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload hingga 5 gambar. Format yang didukung: JPG, PNG, WebP. Maksimal 2MB per gambar.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <CardTitle>Varian Produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {productData.variants.map((variant) => (
                <div key={variant.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Varian {variant.name}</h4>
                    <Button variant="ghost" size="icon" onClick={() => removeVariant(variant.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nama Varian</Label>
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                        placeholder="Nama varian"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Harga (Rp)</Label>
                      <Input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(variant.id, "price", Number(e.target.value))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi (Opsional)</Label>
                    <Input
                      value={variant.description || ""}
                      onChange={(e) => updateVariant(variant.id, "description", e.target.value)}
                      placeholder="Deskripsi varian"
                    />
                  </div>
                </div>
              ))}

              <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg space-y-3">
                <h4 className="font-medium">Tambah Varian Baru</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Varian</Label>
                    <Input
                      value={newVariant.name}
                      onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                      placeholder="Contoh: Basic Edition"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Harga (Rp)</Label>
                    <Input
                      type="number"
                      value={newVariant.price}
                      onChange={(e) => setNewVariant({ ...newVariant, price: Number(e.target.value) })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi (Opsional)</Label>
                  <Input
                    value={newVariant.description}
                    onChange={(e) => setNewVariant({ ...newVariant, description: e.target.value })}
                    placeholder="Deskripsi varian"
                  />
                </div>
                <Button onClick={addVariant} disabled={!newVariant.name.trim() || newVariant.price <= 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Varian
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Metode Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="file"
                    name="deliveryMethod"
                    value="file"
                    checked={productData.deliveryMethod === "file"}
                    onChange={(e) =>
                      setProductData({ ...productData, deliveryMethod: e.target.value as "file" | "link" })
                    }
                  />
                  <Label htmlFor="file" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload File
                  </Label>
                </div>

                {productData.deliveryMethod === "file" && (
                  <div className="ml-6 space-y-2">
                    <Label>URL File</Label>
                    <Input
                      value={productData.fileUrl || ""}
                      onChange={(e) => setProductData({ ...productData, fileUrl: e.target.value })}
                      placeholder="https://example.com/file.pdf"
                    />
                    <p className="text-sm text-muted-foreground">
                      File akan dikirim otomatis ke pembeli setelah pembayaran berhasil
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="link"
                    name="deliveryMethod"
                    value="link"
                    checked={productData.deliveryMethod === "link"}
                    onChange={(e) =>
                      setProductData({ ...productData, deliveryMethod: e.target.value as "file" | "link" })
                    }
                  />
                  <Label htmlFor="link" className="flex items-center">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Link Download
                  </Label>
                </div>

                {productData.deliveryMethod === "link" && (
                  <div className="ml-6 space-y-2">
                    <Label>Link Download</Label>
                    <Input
                      value={productData.downloadLink || ""}
                      onChange={(e) => setProductData({ ...productData, downloadLink: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Link akan diberikan ke pembeli setelah pembayaran berhasil
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
