"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  ImageIcon,
  Star,
  Globe,
  FileText,
  Link,
  Tag,
  Users,
  Shield,
  Wrench,
  Activity,
  DollarSign,
  Plus,
  Trash2,
  Save,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Banner {
  id: string
  title: string
  description: string
  image: string
  link: string
  active: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
}

interface AdminRole {
  id: string
  name: string
  permissions: string[]
}

export function AdminSettings() {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("site")

  // Site Settings
  const [siteSettings, setSiteSettings] = useState({
    siteName: "Jual Digital",
    tagline: "Marketplace Produk Digital Terpercaya",
    logo: "/logo.png",
    favicon: "/favicon.ico",
    platformFee: 5, // percentage
    maintenanceMode: false,
  })

  // Banners
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: "1",
      title: "Promo Akhir Tahun",
      description: "Diskon hingga 50% untuk semua produk digital",
      image: "/placeholder.svg?height=200&width=800&text=Banner+1",
      link: "/categories",
      active: true,
    },
  ])

  // Featured Products
  const [featuredProducts, setFeaturedProducts] = useState([
    { id: "1", title: "E-book Digital Marketing", featured: true },
    { id: "2", title: "Template Website Modern", featured: true },
    { id: "3", title: "Kursus React & Next.js", featured: false },
  ])

  // Categories
  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "E-book", slug: "ebook", description: "Buku digital", icon: "📚" },
    { id: "2", name: "Template", slug: "template", description: "Template website dan desain", icon: "🎨" },
    { id: "3", name: "Kursus Online", slug: "kursus", description: "Kursus dan pembelajaran", icon: "🎓" },
  ])

  // Admin Roles
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([
    {
      id: "1",
      name: "Super Admin",
      permissions: ["all"],
    },
    {
      id: "2",
      name: "Moderator",
      permissions: ["manage_products", "manage_users", "view_analytics"],
    },
  ])

  // Footer Links
  const [footerLinks, setFooterLinks] = useState([
    { id: "1", title: "Tentang Kami", url: "/about", category: "company" },
    { id: "2", title: "Syarat & Ketentuan", url: "/terms", category: "legal" },
    { id: "3", title: "Kebijakan Privasi", url: "/privacy", category: "legal" },
  ])

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Berhasil",
        description: "Pengaturan berhasil disimpan",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addBanner = () => {
    const newBanner: Banner = {
      id: Date.now().toString(),
      title: "",
      description: "",
      image: "",
      link: "",
      active: true,
    }
    setBanners([...banners, newBanner])
  }

  const updateBanner = (id: string, field: keyof Banner, value: string | boolean) => {
    setBanners(banners.map((banner) => (banner.id === id ? { ...banner, [field]: value } : banner)))
  }

  const deleteBanner = (id: string) => {
    setBanners(banners.filter((banner) => banner.id !== id))
  }

  const addCategory = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: "",
      slug: "",
      description: "",
      icon: "📁",
    }
    setCategories([...categories, newCategory])
  }

  const updateCategory = (id: string, field: keyof Category, value: string) => {
    setCategories(categories.map((category) => (category.id === id ? { ...category, [field]: value } : category)))
  }

  const deleteCategory = (id: string) => {
    setCategories(categories.filter((category) => category.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
          <p className="text-muted-foreground">Kelola pengaturan sistem dan konfigurasi</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Simpan Semua
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="site">Situs</TabsTrigger>
          <TabsTrigger value="banners">Banner</TabsTrigger>
          <TabsTrigger value="featured">Unggulan</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="pages">Halaman</TabsTrigger>
          <TabsTrigger value="roles">Admin</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
        </TabsList>

        {/* Site Settings */}
        <TabsContent value="site">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  Pengaturan Situs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Situs</Label>
                    <Input
                      value={siteSettings.siteName}
                      onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={siteSettings.tagline}
                      onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={siteSettings.logo}
                      onChange={(e) => setSiteSettings({ ...siteSettings, logo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon URL</Label>
                    <Input
                      value={siteSettings.favicon}
                      onChange={(e) => setSiteSettings({ ...siteSettings, favicon: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Komisi Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Persentase Komisi (%)</Label>
                  <Input
                    type="number"
                    value={siteSettings.platformFee}
                    onChange={(e) => setSiteSettings({ ...siteSettings, platformFee: Number(e.target.value) })}
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground">Komisi yang diambil platform dari setiap penjualan</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Banners */}
        <TabsContent value="banners">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Banner Homepage
                </div>
                <Button onClick={addBanner}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Banner
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={banner.active}
                        onCheckedChange={(checked) => updateBanner(banner.id, "active", checked)}
                      />
                      <Label>Aktif</Label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Judul</Label>
                      <Input
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, "title", e.target.value)}
                        placeholder="Judul banner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link</Label>
                      <Input
                        value={banner.link}
                        onChange={(e) => updateBanner(banner.id, "link", e.target.value)}
                        placeholder="/categories"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Input
                      value={banner.description}
                      onChange={(e) => updateBanner(banner.id, "description", e.target.value)}
                      placeholder="Deskripsi banner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Gambar</Label>
                    <Input
                      value={banner.image}
                      onChange={(e) => updateBanner(banner.id, "image", e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Featured Products */}
        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                Produk Unggulan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{product.title}</h4>
                    <p className="text-sm text-muted-foreground">ID: {product.id}</p>
                  </div>
                  <Switch
                    checked={product.featured}
                    onCheckedChange={(checked) => {
                      setFeaturedProducts((products) =>
                        products.map((p) => (p.id === product.id ? { ...p, featured: checked } : p)),
                      )
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Tag className="mr-2 h-5 w-5" />
                  Kategori Produk
                </div>
                <Button onClick={addCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Kategori
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Kategori {category.name}</h4>
                    <Button variant="ghost" size="icon" onClick={() => deleteCategory(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nama</Label>
                      <Input
                        value={category.name}
                        onChange={(e) => updateCategory(category.id, "name", e.target.value)}
                        placeholder="Nama kategori"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input
                        value={category.slug}
                        onChange={(e) => updateCategory(category.id, "slug", e.target.value)}
                        placeholder="slug-kategori"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Input
                        value={category.icon}
                        onChange={(e) => updateCategory(category.id, "icon", e.target.value)}
                        placeholder="📁"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Input
                      value={category.description}
                      onChange={(e) => updateCategory(category.id, "description", e.target.value)}
                      placeholder="Deskripsi kategori"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Static Pages */}
        <TabsContent value="pages">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Halaman Statis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Tentang Kami", "Syarat & Ketentuan", "Kebijakan Privasi", "Kontak"].map((page) => (
                  <div key={page} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{page}</h4>
                      <p className="text-sm text-muted-foreground">Terakhir diupdate: 15 Jan 2024</p>
                    </div>
                    <Button variant="outline">Edit</Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link className="mr-2 h-5 w-5" />
                  Link Footer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {footerLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{link.title}</h4>
                      <p className="text-sm text-muted-foreground">{link.url}</p>
                    </div>
                    <Badge variant="outline">{link.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Roles */}
        <TabsContent value="roles">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Role Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {adminRoles.map((role) => (
                  <div key={role.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{role.name}</h4>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission === "all" ? "Semua Akses" : permission.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Keamanan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Wajibkan 2FA untuk semua admin</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">IP Logging</h4>
                    <p className="text-sm text-muted-foreground">Catat alamat IP login admin</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System */}
        <TabsContent value="system">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="mr-2 h-5 w-5" />
                  Mode Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Mode Maintenance</h4>
                    <p className="text-sm text-muted-foreground">Nonaktifkan situs untuk maintenance</p>
                  </div>
                  <Switch
                    checked={siteSettings.maintenanceMode}
                    onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, maintenanceMode: checked })}
                  />
                </div>
                {siteSettings.maintenanceMode && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Situs dalam mode maintenance. Hanya admin yang dapat mengakses.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Log Aktivitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Login admin dari IP 192.168.1.1</span>
                    <span className="text-muted-foreground">5 menit lalu</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Produk baru disetujui</span>
                    <span className="text-muted-foreground">15 menit lalu</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Pengaturan sistem diubah</span>
                    <span className="text-muted-foreground">1 jam lalu</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
