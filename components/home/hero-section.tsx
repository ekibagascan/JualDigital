import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Download, Users, Star } from "lucide-react"
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
                <Link href="/categories">
                  Jelajahi Produk
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/mulai-jualan">Mulai Jualan</Link>
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
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
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 bg-card rounded-2xl shadow-2xl p-8 border">
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
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl transform rotate-3 scale-105 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
