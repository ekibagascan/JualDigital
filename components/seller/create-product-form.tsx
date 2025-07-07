"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, ExternalLink, Save, X, Plus, Upload, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

export function CreateProductForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    longDescription: "",
    category: "",
    price: "",
    originalPrice: "",
    tags: [] as string[],
    livePreview: "",
    files: [] as File[],
    images: [] as File[],
    license: "",
    format: "",
    language: "id",
    deliveryMethod: "upload", // "upload" or "link"
    productLinks: [] as { name: string; url: string }[],
  })

  const [variants, setVariants] = useState([{ id: 1, name: "Standard", price: "", description: "" }])

  const [newTag, setNewTag] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")

  const { user } = useAuth()
  const router = useRouter()

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: string, files: FileList | null) => {
    if (files) {
      setFormData((prev) => ({ ...prev, [field]: Array.from(files) }))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const testLivePreview = () => {
    if (formData.livePreview) {
      setPreviewUrl(formData.livePreview)
      window.open(formData.livePreview, "_blank")
    }
  }

  const addProductLink = () => {
    setFormData((prev) => ({
      ...prev,
      productLinks: [...prev.productLinks, { name: "", url: "" }],
    }))
  }

  const removeProductLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      productLinks: prev.productLinks.filter((_, i) => i !== index),
    }))
  }

  const updateProductLink = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      productLinks: prev.productLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login sebagai penjual untuk menambah produk.",
        variant: "destructive",
      })
      return
    }

    const validVariants = variants.filter((v) => v.name && v.price)
    if (validVariants.length === 0) {
      toast({
        title: "Varian tidak lengkap",
        description: "Minimal satu varian dengan nama dan harga harus diisi.",
        variant: "destructive",
      })
      return
    }

    if (!formData.title || !formData.description || !formData.category || !formData.price) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    // Validate delivery method
    if (formData.deliveryMethod === "upload" && formData.files.length === 0) {
      toast({
        title: "File produk diperlukan",
        description: "Silakan upload file produk atau pilih metode link.",
        variant: "destructive",
      })
      return
    }

    if (formData.deliveryMethod === "link" && formData.productLinks.length === 0) {
      toast({
        title: "Link produk diperlukan",
        description: "Silakan tambahkan minimal satu link produk.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Mock API call to create product
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Produk berhasil ditambahkan!",
        description: "Produk Anda sedang dalam review dan akan segera dipublikasikan.",
      })

      router.push("/seller/products")
    } catch (error) {
      toast({
        title: "Gagal menambah produk",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addVariant = () => {
    const newVariant = {
      id: Date.now(),
      name: "",
      price: "",
      description: "",
    }
    setVariants([...variants, newVariant])
  }

  const removeVariant = (id: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((variant) => variant.id !== id))
    }
  }

  const updateVariant = (id: number, field: string, value: string) => {
    setVariants(variants.map((variant) => (variant.id === id ? { ...variant, [field]: value } : variant)))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Judul Produk *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Contoh: E-book Panduan Digital Marketing"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi Singkat *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Deskripsi singkat yang menarik untuk produk Anda..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="longDescription">Deskripsi Lengkap</Label>
            <Textarea
              id="longDescription"
              value={formData.longDescription}
              onChange={(e) => handleInputChange("longDescription", e.target.value)}
              placeholder="Deskripsi detail tentang produk, fitur, dan manfaat yang didapat..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="music">Musik & Audio</SelectItem>
                  <SelectItem value="software">Software & Tools</SelectItem>
                  <SelectItem value="course">Kursus Online</SelectItem>
                  <SelectItem value="document">Dokumen Bisnis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Bahasa</Label>
              <Select value={formData.language} onValueChange={(value) => handleInputChange("language", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bahasa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="both">Bilingual (ID/EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Harga & Varian Produk
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Varian
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Atur harga dan varian produk Anda. Minimal satu varian diperlukan.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {variants.map((variant, index) => (
            <div key={variant.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Varian {index + 1}</h4>
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(variant.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`variant-name-${variant.id}`}>Nama Varian *</Label>
                  <Input
                    id={`variant-name-${variant.id}`}
                    value={variant.name}
                    onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                    placeholder="Contoh: Standard, Premium, Deluxe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-price-${variant.id}`}>Harga *</Label>
                  <Input
                    id={`variant-price-${variant.id}`}
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(variant.id, "price", e.target.value)}
                    placeholder="99000"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`variant-description-${variant.id}`}>Deskripsi Varian</Label>
                <Textarea
                  id={`variant-description-${variant.id}`}
                  value={variant.description}
                  onChange={(e) => updateVariant(variant.id, "description", e.target.value)}
                  placeholder="Jelaskan apa yang termasuk dalam varian ini..."
                  rows={2}
                />
              </div>
            </div>
          ))}

          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <p>
              <strong>Tips Varian Produk:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>
                <strong>E-book:</strong> Basic (PDF), Premium (PDF + Bonus), Deluxe (PDF + Video + Template)
              </li>
              <li>
                <strong>Template:</strong> Single Use, Commercial License, Extended License
              </li>
              <li>
                <strong>Kursus:</strong> Basic Access, Premium (+ Certificate), VIP (+ 1-on-1 Session)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Product Delivery Method */}
      <Card>
        <CardHeader>
          <CardTitle>Metode Pengiriman Produk</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pilih bagaimana Anda ingin mengirimkan produk digital kepada pembeli
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={formData.deliveryMethod}
            onValueChange={(value) => handleInputChange("deliveryMethod", value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="upload" id="upload" />
              <Label htmlFor="upload" className="flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload File ke Platform
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="link" id="link" />
              <Label htmlFor="link" className="flex items-center gap-2 cursor-pointer">
                <Link2 className="w-4 h-4" />
                Berikan Link Download
              </Label>
            </div>
          </RadioGroup>

          {formData.deliveryMethod === "upload" && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <div>
                <Label htmlFor="files">File Produk *</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange("files", e.target.files)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">Upload file produk digital Anda (Max 500MB total)</p>
              </div>
              <div className="text-sm text-green-700">
                <p>
                  <strong>Keuntungan Upload File:</strong>
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>File tersimpan aman di platform kami</li>
                  <li>Pembeli dapat download langsung setelah pembayaran</li>
                  <li>Tidak perlu khawatir link rusak atau expired</li>
                  <li>Tracking download otomatis</li>
                </ul>
              </div>
            </div>
          )}

          {formData.deliveryMethod === "link" && (
            <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
              <div className="flex items-center justify-between">
                <Label>Link Download Produk *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProductLink}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Link
                </Button>
              </div>

              {formData.productLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded">
                  <div>
                    <Label htmlFor={`link-name-${index}`}>Nama File</Label>
                    <Input
                      id={`link-name-${index}`}
                      value={link.name}
                      onChange={(e) => updateProductLink(index, "name", e.target.value)}
                      placeholder="Contoh: E-book PDF, Bonus Template"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`link-url-${index}`}>URL Download</Label>
                      <Input
                        id={`link-url-${index}`}
                        type="url"
                        value={link.url}
                        onChange={(e) => updateProductLink(index, "url", e.target.value)}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductLink(index)}
                      className="mt-6 text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {formData.productLinks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Belum ada link produk. Klik "Tambah Link" untuk menambahkan.</p>
                </div>
              )}

              <div className="text-sm text-orange-700">
                <p>
                  <strong>Tips Link Download:</strong>
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Gunakan Google Drive, Dropbox, atau OneDrive untuk keamanan</li>
                  <li>Pastikan link dapat diakses publik</li>
                  <li>Gunakan link yang tidak akan expired</li>
                  <li>Test link secara berkala untuk memastikan masih aktif</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Gambar Produk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="images">Gambar Produk *</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileChange("images", e.target.files)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">Upload 1-5 gambar (JPG, PNG - Max 5MB per file)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">Format File</Label>
              <Input
                id="format"
                value={formData.format}
                onChange={(e) => handleInputChange("format", e.target.value)}
                placeholder="Contoh: PDF, ZIP, MP4"
              />
            </div>
            <div>
              <Label htmlFor="license">Lisensi</Label>
              <Select value={formData.license} onValueChange={(value) => handleInputChange("license", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lisensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Use</SelectItem>
                  <SelectItem value="commercial">Commercial Use</SelectItem>
                  <SelectItem value="extended">Extended License</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Berikan link preview untuk membantu pembeli melihat produk Anda sebelum membeli
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="livePreview">URL Live Preview</Label>
            <div className="flex gap-2">
              <Input
                id="livePreview"
                type="url"
                value={formData.livePreview}
                onChange={(e) => handleInputChange("livePreview", e.target.value)}
                placeholder="https://example.com/preview/your-product"
              />
              {formData.livePreview && (
                <Button type="button" variant="outline" onClick={testLivePreview}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Test
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tags">Tambah Tag</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Contoh: Digital Marketing"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Tambah
              </Button>
            </div>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            "Menyimpan..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Simpan Produk
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
