"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase-client'

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const { register, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      const next = searchParams.get('next') || '/'
      console.log('[RegisterForm] User already authenticated, redirecting to:', next)
      router.replace(next)
    }
  }, [user, router, searchParams])

  // Handle errors from auth callback
  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error('Auth callback error:', error, errorDescription)
      toast({
        title: "Registrasi gagal",
        description: errorDescription || "Terjadi kesalahan saat registrasi.",
        variant: "destructive",
      })

      // Clean up the URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('error_description')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Password dan konfirmasi password harus sama.",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password terlalu pendek",
        description: "Password harus minimal 6 karakter.",
        variant: "destructive",
      })
      return
    }

    if (!agreedToTerms) {
      toast({
        title: "Persetujuan diperlukan",
        description: "Mohon setujui syarat dan ketentuan terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await register(formData.name, formData.email, formData.password)
      if (result && (result as any).needsConfirmation) {
        setConfirmationSent(true)
        toast({
          title: "Registrasi berhasil!",
          description: "Silakan cek email Anda dan konfirmasi akun sebelum login.",
        })
        return
      }
      toast({
        title: "Registrasi berhasil!",
        description: "Selamat datang di Jual Digital.",
      })
      router.push("/")
    } catch (error) {
      console.error("Signup error (form):", error)
      toast({
        title: "Registrasi gagal",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Persetujuan diperlukan",
        description: "Mohon setujui syarat dan ketentuan terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.jualdigital.id'}/auth/callback?next=${encodeURIComponent('/')}`,
        }
      })
      if (error) {
        throw new Error(error.message)
      }
      // No need to call register or show success toast here; user will be redirected by Supabase
    } catch (error) {
      console.error("Google signup error:", error)
      toast({
        title: "Registrasi gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat registrasi dengan Google",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Registrasi Berhasil!</CardTitle>
            <p className="text-center text-muted-foreground">
              Silakan cek email Anda dan konfirmasi akun sebelum login.
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/login" className="text-primary hover:underline">
                Kembali ke Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Buat Akun Baru</CardTitle>
          <p className="text-center text-muted-foreground">Bergabung dengan Jual Digital sekarang</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Masukkan email Anda"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Ulangi password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm">
                Saya setuju dengan{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Syarat & Ketentuan
                </Link>{" "}
                dan{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Kebijakan Privasi
                </Link>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Daftar"}
            </Button>

            {/* Google Signup */}
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Daftar dengan Google
              </Button>
            </div>

            <Separator className="my-6" />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Masuk sekarang
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
