"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowRight, ArrowLeft, FileText, CreditCard, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase-client"

const steps = [
  {
    id: 1,
    title: "Informasi Dasar",
    description: "Lengkapi informasi dasar tentang Anda",
    icon: User,
  },
  {
    id: 2,
    title: "Informasi Bisnis",
    description: "Detail tentang bisnis dan produk Anda",
    icon: FileText,
  },
  {
    id: 3,
    title: "Informasi Pembayaran",
    description: "Setup metode pembayaran untuk pencairan",
    icon: CreditCard,
  },
]

export function SellerRegistrationFlow() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    fullName: "",
    phone: "",
    address: "",
    city: "",

    // Step 2: Business Info
    businessName: "",
    category: "",
    description: "",
    website: "",
    socialMedia: "",

    // Step 3: Payment Info
    bankName: "",
    accountNumber: "",
    accountName: "",

    // Agreements
    agreedToTerms: false,
    agreedToCommission: false,
  })

  const supabase = createClient()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.phone && formData.address && formData.city)
      case 2:
        return !!(formData.businessName && formData.category && formData.description)
      case 3:
        return !!(
          formData.bankName &&
          formData.accountNumber &&
          formData.accountName &&
          formData.agreedToTerms &&
          formData.agreedToCommission
        )
      default:
        return false
    }
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk mendaftar sebagai penjual.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!validateStep(3)) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          // Step 1: Basic Info
          name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          // Step 2: Business Info
          business_name: formData.businessName,
          business_category: formData.category,
          business_description: formData.description,
          website: formData.website,
          social_media: formData.socialMedia,
          // Step 3: Payment Info
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          account_name: formData.accountName,
          // Seller status
          role: "seller",
          status: "pending",
        })
        .eq("id", user.id);

      if (error) {
        toast({
          title: "Gagal mengirim aplikasi",
          description: error.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      toast({
        title: "Aplikasi berhasil dikirim!",
        description: "Kami akan meninjau aplikasi Anda dalam 1-2 hari kerja dan mengirim notifikasi melalui email.",
      })

      router.push("/seller/application-submitted")
    } catch (error) {
      toast({
        title: "Gagal mengirim aplikasi",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const progress = (currentStep / steps.length) * 100

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Login Diperlukan</h1>
        <p className="text-muted-foreground mb-8">Silakan login terlebih dahulu untuk mendaftar sebagai penjual</p>
        <Button asChild>
          <a href="/login">Login Sekarang</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Daftar Sebagai Penjual</h1>
        <p className="text-muted-foreground">Ikuti langkah-langkah berikut untuk menjadi penjual di Jual Digital</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                    }
                `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            )
          })}
        </div>
        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Langkah {currentStep} dari {steps.length}: {steps[currentStep - 1].title}
        </p>
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {(() => {
              const CurrentIcon = steps[currentStep - 1].icon
              return <CurrentIcon className="w-6 h-6" />
            })()}
            {steps[currentStep - 1].title}
          </CardTitle>
          <p className="text-muted-foreground">{steps[currentStep - 1].description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Nama Lengkap *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Nomor Telepon *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="city">Kota *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Masukkan kota"
                />
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nama Bisnis/Brand *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Contoh: Ahmad Digital Store"
                />
              </div>
              <div>
                <Label htmlFor="category">Kategori Produk Utama *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori produk" />
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
                <Label htmlFor="description">Deskripsi Bisnis *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Ceritakan tentang bisnis dan produk yang akan Anda jual..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website (Opsional)</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://website-anda.com"
                  />
                </div>
                <div>
                  <Label htmlFor="socialMedia">Media Sosial (Opsional)</Label>
                  <Input
                    id="socialMedia"
                    value={formData.socialMedia}
                    onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                    placeholder="@username atau link profil"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Info */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankName">Nama Bank *</Label>
                <Select value={formData.bankName} onValueChange={(value) => handleInputChange("bankName", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bca">BCA</SelectItem>
                    <SelectItem value="mandiri">Mandiri</SelectItem>
                    <SelectItem value="bni">BNI</SelectItem>
                    <SelectItem value="bri">BRI</SelectItem>
                    <SelectItem value="cimb">CIMB Niaga</SelectItem>
                    <SelectItem value="danamon">Danamon</SelectItem>
                    <SelectItem value="permata">Permata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Nomor Rekening *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                    placeholder="Masukkan nomor rekening"
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Nama Pemilik Rekening *</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => handleInputChange("accountName", e.target.value)}
                    placeholder="Sesuai dengan nama di rekening"
                  />
                </div>
              </div>

              {/* Agreements */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) => handleInputChange("agreedToTerms", checked as boolean)}
                  />
                  <Label htmlFor="agreedToTerms" className="text-sm leading-relaxed">
                    Saya setuju dengan{" "}
                    <a href="/terms" target="_blank" className="text-primary hover:underline" rel="noreferrer">
                      Syarat & Ketentuan Penjual
                    </a>{" "}
                    dan{" "}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline" rel="noreferrer">
                      Kebijakan Privasi
                    </a>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreedToCommission"
                    checked={formData.agreedToCommission}
                    onCheckedChange={(checked) => handleInputChange("agreedToCommission", checked as boolean)}
                  />
                  <Label htmlFor="agreedToCommission" className="text-sm leading-relaxed">
                    Saya memahami dan menyetujui komisi platform sebesar 5% dari setiap penjualan yang berhasil
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 1} className="bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Sebelumnya
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={nextStep}>
                Selanjutnya
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Mengirim..." : "Kirim Aplikasi"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
