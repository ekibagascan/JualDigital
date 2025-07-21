"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Store,
  Shield,
  Settings,
  Heart,
  Package,
  CreditCard,
  HelpCircle,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useCart } from "@/components/providers/cart-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut, loading } = useAuth()
  const { items } = useCart()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">JD Jual Digital</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/categories" className="text-sm font-medium transition-colors hover:text-primary">
              Kategori
            </Link>
            <Link href="/seller" className="text-sm font-medium transition-colors hover:text-primary">
              Mulai Jualan
            </Link>
            <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary">
              Bantuan
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk digital..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>
            </Button>

            {/* User Menu */}
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    {user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                          alt={user.name}
                        />
                        <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  {/* User Info Section */}
                  <div className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-muted/50">
                    {user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                          alt={user.name}
                        />
                        <AvatarFallback className="text-sm font-medium">
                          {user.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{user.name?.charAt(0) ?? "U"}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Main Navigation */}
                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/dashboard">
                        <User className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>

                    {user.role === "seller" && (
                      <DropdownMenuItem asChild className="gap-3 py-2.5">
                        <Link href="/seller">
                          <Store className="h-4 w-4" />
                          <span>Toko Saya</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {user.role === "admin" && (
                      <DropdownMenuItem asChild className="gap-3 py-2.5">
                        <Link href="/admin">
                          <Shield className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>

                  <DropdownMenuSeparator />

                  {/* Shopping & Account */}
                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/purchases">
                        <Package className="h-4 w-4" />
                        <span>Pembelian Saya</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/wishlist">
                        <Heart className="h-4 w-4" />
                        <span>Wishlist</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/orders">
                        <CreditCard className="h-4 w-4" />
                        <span>Riwayat Pesanan</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Settings & Help */}
                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/profile">
                        <Settings className="h-4 w-4" />
                        <span>Pengaturan</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                      <Link href="/help">
                        <HelpCircle className="h-4 w-4" />
                        <span>Bantuan</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="gap-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Daftar</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {!loading && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link href="/categories" className="text-sm font-medium transition-colors hover:text-primary">
                Kategori
              </Link>
              <Link href="/seller" className="text-sm font-medium transition-colors hover:text-primary">
                Mulai Jualan
              </Link>
              <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary">
                Bantuan
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
