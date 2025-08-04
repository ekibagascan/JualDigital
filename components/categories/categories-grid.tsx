"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Book, Palette, Music, Code, Video, FileText, Camera, Gamepad2, Image, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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

// Color mapping for categories
const colorMap: Record<string, string> = {
  ebook: "bg-blue-500",
  template: "bg-purple-500",
  music: "bg-green-500",
  software: "bg-orange-500",
  kursus: "bg-red-500",
  grafis: "bg-pink-500",
  akun: "bg-indigo-500",
  video: "bg-teal-500",
}

interface Category {
  id: string
  uuid: string
  name: string
  slug: string
  count: number
}

export function CategoriesGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category) => {
        const Icon = iconMap[category.slug] || Book
        const color = colorMap[category.slug] || "bg-gray-500"
        return (
          <Link key={category.slug} href={`/produk?categories=${category.slug}`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 ${color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                    <p className="text-sm text-primary font-medium mb-2">
                      {category.count.toLocaleString("id-ID")} produk
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      Produk digital dalam kategori {category.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
