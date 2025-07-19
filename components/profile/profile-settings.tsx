"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Camera, Save, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

export function ProfileSettings() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    website: "",
    location: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [notifications, setNotifications] = useState({
    emailMarketing: true,
    emailUpdates: true,
    emailSecurity: true,
    pushNotifications: false,
  })

  // Load profile data on component mount
  useEffect(() => {
    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const { profile } = await response.json()
        console.log('Loaded profile:', profile)
        setProfileData({
          name: profile.name || "",
          email: user.email || "",
          phone: profile.phone || "",
          bio: profile.bio || "",
          website: profile.website || "",
          location: profile.address || "",
        })

        // Update the user object with the avatar URL
        if (profile.avatar_url) {
          user.avatar = profile.avatar_url
        } else if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
          // Use Google avatar if profile doesn't have one
          user.avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session found')
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        toast({
          title: "Profil berhasil diperbarui",
          description: "Informasi profil Anda telah disimpan.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: "Gagal memperbarui profil",
        description: error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Password baru dan konfirmasi password harus sama.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password terlalu pendek",
        description: "Password harus minimal 6 karakter.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        throw error
      }

      toast({
        title: "Password berhasil diubah",
        description: "Password Anda telah diperbarui.",
      })

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error('Password change error:', error)
      toast({
        title: "Gagal mengubah password",
        description: error instanceof Error ? error.message : "Password lama tidak sesuai.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationSubmit = async () => {
    setIsLoading(true)

    try {
      // Mock API call for notifications (you can implement real notification settings later)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Pengaturan notifikasi disimpan",
        description: "Preferensi notifikasi Anda telah diperbarui.",
      })
    } catch (error) {
      toast({
        title: "Gagal menyimpan pengaturan",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      console.log('Starting image upload for file:', file.name, file.size)
      setIsLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        throw new Error('No session found')
      }

      console.log('Session found, user ID:', user?.id)

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`

      console.log('Uploading file to storage:', fileName)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      console.log('Public URL generated:', publicUrl)

      // Update profile with new avatar URL
      console.log('Updating profile with avatar URL:', publicUrl)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...profileData,
          avatar_url: publicUrl
        })
      })

      console.log('Profile update response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Profile update successful:', result)

        // Update the user object with new avatar
        if (user) {
          user.avatar = publicUrl
        }

        toast({
          title: "Foto profil berhasil diperbarui",
          description: "Foto profil Anda telah disimpan.",
        })

        // Force a re-render by updating state
        setProfileData(prev => ({
          ...prev,
          avatar_url: publicUrl
        }))

        // Reload profile data
        await loadProfile()
      } else {
        const errorData = await response.json()
        console.error('Profile update failed:', errorData)
        throw new Error(errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Image upload error:', error)
      toast({
        title: "Gagal mengunggah foto",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengunggah foto.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Login Diperlukan</h2>
        <p className="text-muted-foreground mb-8">Silakan login untuk mengakses pengaturan profil</p>
        <Button asChild>
          <a href="/login">Login Sekarang</a>
        </Button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="security">Keamanan</TabsTrigger>
        <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || "/placeholder.svg"}
                    alt={user.name}
                  />
                  <AvatarFallback className="text-2xl">
                    {user.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Ubah Foto
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">JPG, PNG maksimal 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange("email", e.target.value)}
                    placeholder="Masukkan email"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange("phone", e.target.value)}
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Lokasi</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => handleProfileChange("location", e.target.value)}
                    placeholder="Kota, Negara"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profileData.website}
                  onChange={(e) => handleProfileChange("website", e.target.value)}
                  placeholder="https://website-anda.com"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => handleProfileChange("bio", e.target.value)}
                  placeholder="Ceritakan tentang diri Anda..."
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Keamanan Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                    placeholder="Masukkan password saat ini"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    placeholder="Masukkan password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder="Ulangi password baru"
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Mengubah..." : "Ubah Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Notifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Marketing</h4>
                  <p className="text-sm text-muted-foreground">Terima email tentang produk dan penawaran baru</p>
                </div>
                <Switch
                  checked={notifications.emailMarketing}
                  onCheckedChange={(checked) => handleNotificationChange("emailMarketing", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Update Produk</h4>
                  <p className="text-sm text-muted-foreground">Notifikasi tentang update produk yang Anda beli</p>
                </div>
                <Switch
                  checked={notifications.emailUpdates}
                  onCheckedChange={(checked) => handleNotificationChange("emailUpdates", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Keamanan Akun</h4>
                  <p className="text-sm text-muted-foreground">Notifikasi penting tentang keamanan akun</p>
                </div>
                <Switch
                  checked={notifications.emailSecurity}
                  onCheckedChange={(checked) => handleNotificationChange("emailSecurity", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Push Notifications</h4>
                  <p className="text-sm text-muted-foreground">Notifikasi push di browser</p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                />
              </div>
            </div>

            <Button onClick={handleNotificationSubmit} disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
