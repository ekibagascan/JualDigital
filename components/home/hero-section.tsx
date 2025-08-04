"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Download, Users, Star, Sparkles, Zap, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"

export function HeroSection() {
  const [popularProducts, setPopularProducts] = useState<
    { id: string; title: string; price: number; total_sales: number }[]
  >([])

  useEffect(() => {
    const fetchPopularProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, total_sales")
        .order("total_sales", { ascending: false })
        .limit(3)
      if (!error && data) {
        setPopularProducts(data)
      }
    }
    fetchPopularProducts()
  }, [])

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                Jual & Beli
                <span className="text-primary block">Produk Digital</span>
                di Indonesia
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Platform marketplace terpercaya untuk produk digital. Temukan e-book, template, musik, software, dan
                kursus online berkualitas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/produk">
                  Jelajahi Produk
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/mulai-jualan">Mulai Jualan</Link>
              </Button>
            </div>

            {/* Stats section - DISABLED */}
            {/* <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">1000+ Pengguna</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">100+ Download</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">5 Rating</span>
              </div>
            </div> */}
          </div>

          <div className="relative">
            {/* Produk Terpopuler section - DISABLED and replaced with attractive animation */}
            {/* <div className="relative z-10 bg-card rounded-2xl shadow-2xl p-8 border">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Produk Terpopuler</h3>
                  <span className="text-sm text-muted-foreground">Hari ini</span>
                </div>

                <div className="space-y-4">
                  {popularProducts.length > 0 ? (
                    popularProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{product.total_sales} terjual</p>
                        </div>
                        <p className="font-semibold text-primary">
                          {product.price.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Memuat produk terpopuler...</p>
                  )}
                </div>
              </div>
            </div> */}

            {/* Attractive Animation Section */}
            <div className="relative z-10 bg-card rounded-2xl shadow-2xl p-8 border overflow-hidden">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">🚀 Platform Terpercaya</h3>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-full">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Transaksi Aman</p>
                        <p className="text-xs text-muted-foreground">100% Terjamin</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">✓ Verified</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Produk Berkualitas</p>
                        <p className="text-xs text-muted-foreground">Curated Selection</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">⭐ Premium</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-full">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Instant Download</p>
                        <p className="text-xs text-muted-foreground">Langsung Dapat</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">⚡ Fast</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating animation elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="absolute bottom-8 left-6 w-1 h-1 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-12 left-4 w-1 h-1 bg-primary/60 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl transform rotate-3 scale-105 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
