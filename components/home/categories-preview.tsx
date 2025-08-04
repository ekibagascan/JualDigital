"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Book, Palette, Music, Code, Video, FileText, Image, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import useEmblaCarousel from 'embla-carousel-react'

// Icon mapping for categories
const iconMap: Record<string, any> = {
  ebook: Book,
  template: Palette,
  music: Music,
  software: Code,
  kursus: Video,
  grafis: Image,
  akun: Users,
  video: Video,
}

interface Category {
  id: string
  uuid: string
  name: string
  slug: string
  count: number
}

export function CategoriesPreview() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()

        if (data.success) {
          setCategories(data.categories)
        } else {
          console.error('Failed to fetch categories:', data.error)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Jelajahi Kategori</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Temukan produk digital sesuai kebutuhan Anda dari berbagai kategori
            </p>
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-48 animate-pulse">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="w-12 h-12 bg-muted rounded-full" />
                      </div>
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Jelajahi Kategori</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan produk digital sesuai kebutuhan Anda dari berbagai kategori
          </p>
        </div>

        <div className="relative">
          {/* Left Arrow */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Right Arrow */}
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Embla Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {categories.map((category) => {
                const Icon = iconMap[category.slug] || Book
                return (
                  <div key={category.slug} className="flex-shrink-0 w-48">
                    <Link href={`/produk?categories=${category.slug}`}>
                      <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                        <CardContent className="p-6 text-center">
                          <div className="mb-4 flex justify-center">
                            <div className="p-3 bg-primary/10 rounded-full">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          <h3 className="font-semibold mb-1">{category.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Produk digital dalam kategori {category.name}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
