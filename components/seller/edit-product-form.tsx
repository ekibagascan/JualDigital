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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, X, Plus, Save, ArrowLeft, Sparkles, Wand2, Eye, ExternalLink, Link2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"


interface ProductData {
  id: string
  title: string
  description: string
  long_description?: string
  category: string
  price: number
  original_price?: number
  image_url?: string
  images?: (string | File)[]
  files?: File[]
  file_url?: string
  download_link?: string
  live_preview?: string
  tags?: string[]
  status: "draft" | "pending" | "active" | "inactive" | "rejected"
  file_size?: string
  format?: string
  pages?: number
  language?: string
  download_limit?: number
  license?: string
  delivery_method: "file" | "link"
  thumbnailIndex?: number
}

interface VariantData {
  id: number
  name: string
  price: number
  description: string
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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [variants, setVariants] = useState([{ id: 1, name: "Standard", price: "", description: "" }])
  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [productLinks, setProductLinks] = useState<{ name: string; url: string }[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [thumbnailIndex, setThumbnailIndex] = useState(0)

  // Fetch product data from API
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/seller/products/${productId}?t=${Date.now()}`, { cache: 'no-store' })

        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }

        const { product, variants: productVariants } = await response.json()

        if (product) {
          setProductData(product)

          // Set variants from API or default
          if (productVariants && productVariants.length > 0) {
            setVariants(productVariants.map((variant: VariantData, index: number) => ({
              id: variant.id || index + 1,
              name: variant.name,
              price: variant.price.toString(),
              description: variant.description || ""
            })))
          } else {
            // Set initial variant with product price
            setVariants([{
              id: 1,
              name: "Standard",
              price: product.price.toString(),
              description: ""
            }])
          }

          // Set image preview from images array or fallback to image_url
          if (product.images && product.images.length > 0) {
            setImagePreview(product.images)
            // Find which image is currently the thumbnail
            const currentThumbnailIndex = product.images.findIndex((img: string) => img === product.image_url)
            setThumbnailIndex(currentThumbnailIndex >= 0 ? currentThumbnailIndex : 0)
          } else if (product.image_url) {
            setImagePreview([product.image_url])
            setThumbnailIndex(0)
          }

          // Set product links from download_link
          if (product.download_link) {
            setProductLinks([{ name: "", url: product.download_link }])
          }

          // Ensure delivery method is set
          if (!product.delivery_method) {
            setProductData(prev => prev ? { ...prev, delivery_method: product.download_link ? 'link' : 'file' } : null)
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error)
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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  // AI Description Generator
  const generateAIDescription = async (type: 'short' | 'long') => {
    if (!productData?.title || !productData?.category) {
      toast({
        title: "Error",
        description: "Please fill in the product title first",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingAI(true)

    try {
      const prompt = type === 'short'
        ? `Generate a short, compelling product description (max 150 characters) for: "${productData.title}"${productData.category ? ` in category "${productData.category}"` : ''}. Focus on key benefits and value proposition.`
        : `Generate a detailed product description (max 500 characters) for: "${productData.title}"${productData.category ? ` in category "${productData.category}"` : ''}. Include features, benefits, target audience, and usage instructions.`

      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type })
      })

      if (response.ok) {
        const data = await response.json()
        const generatedText = data.description

        if (type === 'short') {
          setProductData(prev => prev ? { ...prev, description: generatedText } : null)
        } else {
          setProductData(prev => prev ? { ...prev, long_description: generatedText } : null)
        }

        toast({
          title: "Success",
          description: `AI generated ${type} description successfully`,
        })
      } else {
        throw new Error('Failed to generate description')
      }
    } catch (error) {
      console.error('[AI DESCRIPTION] Error:', error)
      toast({
        title: "Error",
        description: "Failed to generate AI description. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleInputChange = (field: string, value: string | string[] | number) => {
    setProductData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleFileChange = (field: string, files: FileList | null) => {
    if (files) {
      // For images, append new files to existing ones
      if (field === 'images') {
        setProductData(prev => {
          if (!prev) return null
          const existingImages = prev.images || []
          const newImages = Array.from(files)
          const allImages = [...existingImages, ...newImages]

          // Limit to 12 images maximum
          if (allImages.length > 12) {
            toast({
              title: "Terlalu banyak gambar",
              description: "Maksimal 12 gambar per produk",
              variant: "destructive",
            })
            return prev
          }

          return { ...prev, [field]: allImages }
        })

        // Generate preview URLs for new images
        const newUrls = Array.from(files).map(file => URL.createObjectURL(file))
        setImagePreviewUrls(prev => [...(prev || []), ...newUrls])
      } else {
        // For other file fields, replace existing files
        setProductData(prev => prev ? { ...prev, [field]: Array.from(files) } : null)
      }
    }
  }

  const addTag = () => {
    if (newTag.trim() && productData && !productData.tags?.includes(newTag.trim())) {
      setProductData(prev => prev ? {
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      } : null)
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setProductData(prev => prev ? {
      ...prev,
      tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
    } : null)
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

  const addProductLink = () => {
    setProductLinks([...productLinks, { name: "", url: "" }])
  }

  const removeProductLink = (index: number) => {
    if (productLinks.length > 1) {
      setProductLinks(productLinks.filter((_, i) => i !== index))
    }
  }

  const updateProductLink = (index: number, field: string, value: string) => {
    setProductLinks(productLinks.map((link, i) => i === index ? { ...link, [field]: value } : link))
  }

  const testLivePreview = () => {
    if (productData?.live_preview) {
      window.open(productData.live_preview, '_blank')
    }
  }

  const handleSave = async () => {
    if (!productData) return

    setSaving(true)
    try {
      // Handle image upload if there are new images
      let imageUrl = productData.image_url
      let imageUrls: string[] = []

      if (productData.images && productData.images.length > 0) {
        // Check if we have new files to upload
        const newImages = productData.images.filter(img => typeof img === 'object')
        const existingImages = productData.images.filter(img => typeof img === 'string')

        // Start with existing image URLs
        imageUrls = [...existingImages]

        // Upload new images
        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i] as File

          // Upload image via API
          const formData = new FormData()
          formData.append('file', file)

          const uploadResponse = await fetch('/api/seller/upload-image', {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json()
            console.error('Error uploading image:', errorData)
            toast({
              title: "Error",
              description: "Gagal upload gambar",
              variant: "destructive",
            })
            return
          }

          const uploadData = await uploadResponse.json()
          imageUrls.push(uploadData.url)

          // Use selected thumbnail or first image as main thumbnail
          if (i === thumbnailIndex || (thumbnailIndex === 0 && i === 0)) {
            imageUrl = uploadData.url
          }
        }

        // Always use the selected thumbnail from existing images
        if (imageUrls.length > 0) {
          imageUrl = imageUrls[thumbnailIndex] || imageUrls[0]
        }
      }

      // Handle file upload if delivery method is "file"
      let fileUrl = productData.file_url
      if (productData.delivery_method === "file" && productData.files && productData.files.length > 0 && typeof productData.files[0] === 'object') {
        const file = productData.files[0] as File

        // Upload file via API
        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await fetch('/api/seller/upload-file', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error('Error uploading file:', errorData)
          toast({
            title: "Error",
            description: "Gagal upload file produk",
            variant: "destructive",
          })
          return
        }

        const uploadData = await uploadResponse.json()
        fileUrl = uploadData.url
      }

      // Prepare request body
      const requestBody = {
        title: productData.title,
        description: productData.description,
        longDescription: productData.long_description,
        category: productData.category,
        price: variants[0]?.price && variants[0].price !== "" ? parseFloat(variants[0].price) : productData.price,
        variants: variants,
        language: productData.language,
        tags: productData.tags,
        livePreview: productData.live_preview,
        license: productData.license,
        format: productData.format,
        originalPrice: productData.original_price,
        productLinks: productLinks,
        downloadLimit: productData.download_limit || -1,
        pages: productData.pages,
        imageUrl: imageUrl,
        imageUrls: imageUrls,
        fileUrl: fileUrl,
        status: productData.status,
        deliveryMethod: productData.delivery_method,
        thumbnailIndex: thumbnailIndex
      }

      const response = await fetch(`/api/seller/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update product')
      }

      const responseData = await response.json()

      // Update local state with the updated product data
      if (responseData.product) {
        setProductData(responseData.product)

        // Update image preview if images were changed
        if (responseData.product.images && responseData.product.images.length > 0) {
          setImagePreview(responseData.product.images)
          setThumbnailIndex(0) // Reset to first image
        }

        // Update product links if download_link was changed
        if (responseData.product.download_link) {
          setProductLinks([{ name: "", url: responseData.product.download_link }])
        }

        // Update variants if they were changed
        if (responseData.variants && responseData.variants.length > 0) {
          setVariants(responseData.variants.map((variant: VariantData, index: number) => ({
            id: variant.id || index + 1,
            name: variant.name,
            price: variant.price.toString(),
            description: variant.description || ""
          })))
        }
      }

      toast({
        title: "Berhasil",
        description: "Produk berhasil diperbarui",
      })
      router.refresh()
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data produk...</p>
        </div>
      </div>
    )
  }

  if (!productData) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Produk Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-8">Produk yang Anda cari tidak ditemukan atau telah dihapus.</p>
        <Button asChild>
          <div onClick={() => router.back()}>Kembali</div>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/seller/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{productData.status}</Badge>
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

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
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
                value={productData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Contoh: E-book Panduan Digital Marketing"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi Singkat *</Label>
              <Textarea
                id="description"
                value={productData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Deskripsi singkat yang menarik untuk produk Anda..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Tip: Isi judul produk terlebih dahulu, lalu gunakan tombol AI untuk generate deskripsi otomatis
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateAIDescription('short')}
                disabled={isGeneratingAI}
                className="mt-2 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingAI ? "Membuat..." : "✨ Auto-generate"}
              </Button>
            </div>

            <div>
              <Label htmlFor="longDescription">Deskripsi Lengkap</Label>
              <Textarea
                id="longDescription"
                value={productData.long_description || ''}
                onChange={(e) => handleInputChange("long_description", e.target.value)}
                placeholder="Deskripsi detail tentang produk, fitur, dan manfaat yang didapat..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Tip: Gunakan AI untuk generate deskripsi lengkap yang profesional dan menarik
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateAIDescription('long')}
                disabled={isGeneratingAI}
                className="mt-2 flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isGeneratingAI ? "Membuat..." : "🪄 Auto-generate"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select value={productData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grafis">Grafis</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="akun">Akun</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="kursus">Kursus Online</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="music">Musik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Bahasa</Label>
                <Select value={productData.language || 'id'} onValueChange={(value) => handleInputChange("language", value)}>
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
                      onChange={(e) => {
                        updateVariant(variant.id, "price", e.target.value)
                        // Update main product price if this is the first variant
                        if (index === 0) {
                          handleInputChange("price", e.target.value)
                        }
                      }}
                      placeholder="99000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`variant-description-${variant.id}`}>Deskripsi Varian (opsional)</Label>
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
              value={productData.delivery_method || "file"}
              onValueChange={(value) => handleInputChange("delivery_method", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="file" />
                <Label htmlFor="file" className="flex items-center gap-2 cursor-pointer">
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

            {productData.delivery_method === "file" && (
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

            {productData.delivery_method === "link" && (
              <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between">
                  <Label>Link Download Produk *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addProductLink}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Link
                  </Button>
                </div>

                {productLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 p-3 border rounded">
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
                ))}

                {productLinks.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Belum ada link download. Klik &ldquo;Tambah Link&rdquo; untuk menambahkan link produk.</p>
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
              <p className="text-xs text-muted-foreground mt-1">Upload 1-12 gambar (JPG, PNG - Max 5MB per file)</p>
            </div>

            {/* Image Preview */}
            {(imagePreviewUrls.length > 0 || imagePreview.length > 0) && (
              <div className="mt-4">
                <Label>Preview Gambar:</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {/* Show new uploaded images */}
                  {imagePreviewUrls.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-50">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white shadow-lg"
                          onClick={() => {
                            setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
                            setProductData(prev => prev ? {
                              ...prev,
                              images: prev.images?.filter((_, i) => i !== index) || []
                            } : null)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {/* Show existing images */}
                  {imagePreview.map((preview, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-50">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />

                        {/* Thumbnail Selection Button */}
                        <Button
                          type="button"
                          variant={thumbnailIndex === index ? "default" : "outline"}
                          size="sm"
                          className={`absolute top-2 left-2 h-6 px-2 text-xs ${thumbnailIndex === index
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-white/90 hover:bg-white text-gray-700"
                            } shadow-lg`}
                          onClick={() => setThumbnailIndex(index)}
                        >
                          {thumbnailIndex === index ? "✓ Thumbnail" : "Set Thumbnail"}
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white shadow-lg"
                          onClick={() => {
                            setImagePreview(imagePreview.filter((_, i) => i !== index))
                            setProductData(prev => prev ? {
                              ...prev,
                              images: prev.images?.filter((_, i) => i !== index) || []
                            } : null)
                            // Update thumbnail index if needed
                            if (thumbnailIndex === index) {
                              setThumbnailIndex(0)
                            } else if (thumbnailIndex > index) {
                              setThumbnailIndex(thumbnailIndex - 1)
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thumbnail Info */}
                {imagePreview.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>Thumbnail:</strong> Gambar pertama akan digunakan sebagai thumbnail utama produk.
                    Klik &ldquo;Set Thumbnail&rdquo; pada gambar yang ingin dijadikan thumbnail.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="format">Format File</Label>
                <Input
                  id="format"
                  value={productData.format || ''}
                  onChange={(e) => handleInputChange("format", e.target.value)}
                  placeholder="Contoh: PDF, ZIP, MP4"
                />
              </div>
              <div>
                <Label htmlFor="license">Lisensi</Label>
                <Select value={productData.license || ''} onValueChange={(value) => handleInputChange("license", value)}>
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
                  value={productData.live_preview || ''}
                  onChange={(e) => handleInputChange("live_preview", e.target.value)}
                  placeholder="https://example.com/preview/your-product"
                />
                {productData.live_preview && (
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

            {(productData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(productData.tags || []).map((tag, index) => (
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

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pages">Jumlah Halaman</Label>
                <Input
                  id="pages"
                  type="number"
                  value={productData.pages || ''}
                  onChange={(e) => handleInputChange("pages", e.target.value)}
                  placeholder="Contoh: 50"
                />
              </div>
              <div>
                <Label htmlFor="download_limit">Limit Download</Label>
                <Input
                  id="download_limit"
                  type="number"
                  value={productData.download_limit || ''}
                  onChange={(e) => handleInputChange("download_limit", e.target.value)}
                  placeholder="-1 untuk unlimited"
                />
                <p className="text-xs text-muted-foreground mt-1">-1 = unlimited, 0 = tidak bisa download</p>
              </div>
            </div>

            {/* Aktifkan produk toggle - ONLY DIFFERENCE FROM CREATE FORM */}
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={productData.status === "active"}
                onCheckedChange={(checked) =>
                  handleInputChange("status", checked ? "active" : "draft")
                }
              />
              <Label htmlFor="status">Aktifkan produk</Label>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
