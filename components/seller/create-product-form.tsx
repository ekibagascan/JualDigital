"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, ExternalLink, Save, X, Plus, Upload, Link2, Sparkles, Wand2 } from "lucide-react"
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
import { supabase } from "@/lib/supabase-client"

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
    thumbnailIndex: 0, // Index of the selected thumbnail image
  })

  const [variants, setVariants] = useState([{ id: 1, name: "Standard", price: "", description: "" }])

  const [newTag, setNewTag] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const { user } = useAuth()
  const router = useRouter()

  // AI Description Generator
  const generateAIDescription = async (type: 'short' | 'long') => {
    if (!formData.title) {
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
        ? `Generate a short, compelling product description (max 150 characters) for: "${formData.title}"${formData.category ? ` in category "${formData.category}"` : ''}. Focus on key benefits and value proposition.`
        : `Generate a detailed product description (max 500 characters) for: "${formData.title}"${formData.category ? ` in category "${formData.category}"` : ''}. Include features, benefits, target audience, and usage instructions.`

      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type })
      })

      if (response.ok) {
        const data = await response.json()
        const generatedText = data.description

        if (type === 'short') {
          setFormData(prev => ({ ...prev, description: generatedText }))
        } else {
          setFormData(prev => ({ ...prev, longDescription: generatedText }))
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
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: string, files: FileList | null) => {
    if (files) {
      // For images, append new files to existing ones
      if (field === 'images') {
        setFormData((prev) => {
          const existingImages = prev.images || []
          const newImages = Array.from(files)
          const allImages = [...existingImages, ...newImages]

          // Limit to 5 images maximum
          if (allImages.length > 5) {
            toast({
              title: "Terlalu banyak gambar",
              description: "Maksimal 5 gambar per produk",
              variant: "destructive",
            })
            return prev
          }

          return { ...prev, [field]: allImages }
        })

        // Create image previews for all images (existing + new)
        const fileArray = Array.from(files)

        setFormData((prev) => {
          const existingPreviews = imagePreview || []
          const newPreviews: string[] = []
          let loadedCount = 0

          fileArray.forEach((file, index) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              if (e.target?.result) {
                newPreviews[index] = e.target.result as string
                loadedCount++

                // Only update preview when all new files are loaded
                if (loadedCount === fileArray.length) {
                  const allPreviews = [...existingPreviews, ...newPreviews]
                  setImagePreview(allPreviews)
                }
              }
            }
            reader.readAsDataURL(file)
          })

          return prev
        })
      } else {
        // For other file fields, replace existing files
        setFormData((prev) => ({ ...prev, [field]: Array.from(files) }))
      }
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

    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi judul, deskripsi, dan kategori produk.",
        variant: "destructive",
      })
      return
    }

    // Check if at least one variant has price
    const hasValidPrice = variants.some(v => v.name && v.price && parseFloat(v.price) > 0)
    if (!hasValidPrice) {
      toast({
        title: "Harga tidak valid",
        description: "Minimal satu varian dengan nama dan harga harus diisi.",
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
      // Prepare variants data
      const variantsData = validVariants.map(variant => ({
        name: variant.name,
        price: parseFloat(variant.price),
        description: variant.description,
      }))

      // Handle image uploads first if any
      let imageUrl = null
      let imageUrls: string[] = []

      if (formData.images.length > 0) {
        try {
          // Upload all images
          for (let i = 0; i < formData.images.length; i++) {
            const image = formData.images[i]
            const fileName = `${user.id}-${Date.now()}-${i}-${image.name}`
            const { error } = await supabase.storage
              .from('products')
              .upload(fileName, image)

            if (error) {
              console.error('[CREATE PRODUCT] Image upload error:', error)
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(fileName)
              imageUrls.push(publicUrl)

              // Use selected thumbnail or first image as main thumbnail
              if (i === formData.thumbnailIndex || (formData.thumbnailIndex === 0 && i === 0)) {
                imageUrl = publicUrl
              }
            }
          }
          
          // If no thumbnail was set, use the first image
          if (!imageUrl && imageUrls.length > 0) {
            imageUrl = imageUrls[0]
          }
        } catch (uploadError) {
          console.error('[CREATE PRODUCT] Image upload failed:', uploadError)
        }
      }

      // Create product via API
      const requestBody = {
        title: formData.title,
        description: formData.description,
        longDescription: formData.longDescription,
        category: formData.category,
        price: validVariants[0]?.price || formData.price, // Use variant price as primary price
        variants: variantsData,
        sellerId: user.id, // Send seller ID for authentication
        language: formData.language,
        tags: formData.tags,
        livePreview: formData.livePreview,
        license: formData.license,
        format: formData.format,
        deliveryMethod: formData.deliveryMethod,
        productLinks: formData.productLinks,
        downloadLimit: -1, // Set to infinite
        imageUrl: imageUrl, // Include the uploaded image URL
        imageUrls: imageUrls, // Include all uploaded image URLs
        thumbnailIndex: formData.thumbnailIndex, // Include thumbnail selection
      }

      console.log('[CREATE PRODUCT] Sending request body:', requestBody)

      const response = await fetch('/api/seller/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const result = await response.json()
      const productId = result.product?.id

      // Handle file uploads if any
      if (formData.files.length > 0) {
        // TODO: Implement file upload to Supabase Storage
        console.log('[CREATE PRODUCT] File upload not implemented yet')
      }



      toast({
        title: "Produk berhasil ditambahkan!",
        description: "Produk Anda sedang dalam review dan akan segera dipublikasikan.",
      })

      router.push("/seller/products")
    } catch (error) {
      console.error('[CREATE PRODUCT] Error:', error)
      toast({
        title: "Gagal menambah produk",
        description: error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.",
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
              value={formData.longDescription}
              onChange={(e) => handleInputChange("longDescription", e.target.value)}
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
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
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

          {/* Image Preview */}
          {imagePreview.length > 0 && (
            <div className="mt-4">
              <Label>Preview Gambar:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {imagePreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-50">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      
                      {/* Thumbnail Selection Button */}
                      <Button
                        type="button"
                        variant={formData.thumbnailIndex === index ? "default" : "outline"}
                        size="sm"
                        className={`absolute top-2 left-2 h-6 px-2 text-xs ${
                          formData.thumbnailIndex === index 
                            ? "bg-blue-600 hover:bg-blue-700 text-white" 
                            : "bg-white/90 hover:bg-white text-gray-700"
                        } shadow-lg`}
                        onClick={() => handleInputChange("thumbnailIndex", index)}
                      >
                        {formData.thumbnailIndex === index ? "✓ Thumbnail" : "Set Thumbnail"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white shadow-lg"
                        onClick={() => {
                          setImagePreview(imagePreview.filter((_, i) => i !== index))
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index),
                            thumbnailIndex: prev.thumbnailIndex === index ? 0 : 
                              prev.thumbnailIndex > index ? prev.thumbnailIndex - 1 : prev.thumbnailIndex
                          }))
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
                  Klik "Set Thumbnail" pada gambar yang ingin dijadikan thumbnail.
                </div>
              )}
            </div>
          )}

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
