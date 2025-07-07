import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CategoryHeader } from "@/components/categories/category-header"
import { ProductsFilter } from "@/components/categories/products-filter"
import { ProductsList } from "@/components/categories/products-list"

// Mock function to get category data
async function getCategoryData(slug: string) {
  const categories = {
    ebook: {
      name: "E-book",
      description: "Koleksi e-book digital berkualitas tinggi dari berbagai topik dan genre",
      icon: "Book",
      totalProducts: 2543,
    },
    template: {
      name: "Template",
      description: "Template design, website, dan presentasi siap pakai untuk berbagai kebutuhan",
      icon: "Palette",
      totalProducts: 1876,
    },
    music: {
      name: "Musik & Audio",
      description: "Musik, sound effect, dan audio digital berkualitas tinggi",
      icon: "Music",
      totalProducts: 1234,
    },
    software: {
      name: "Software & Tools",
      description: "Aplikasi, plugin, dan tools digital untuk produktivitas",
      icon: "Code",
      totalProducts: 856,
    },
    course: {
      name: "Kursus Online",
      description: "Video tutorial dan kursus pembelajaran dari ahli berpengalaman",
      icon: "Video",
      totalProducts: 642,
    },
    document: {
      name: "Dokumen Bisnis",
      description: "Template dokumen dan form bisnis siap pakai",
      icon: "FileText",
      totalProducts: 423,
    },
  }

  return categories[slug as keyof typeof categories] || null
}

interface CategoryPageProps {
  params: {
    slug: string
  }
  searchParams: {
    sort?: string
    price_min?: string
    price_max?: string
    rating?: string
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = await getCategoryData(params.slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <CategoryHeader category={category} />

        <div className="grid lg:grid-cols-4 gap-8 mt-8">
          <div className="lg:col-span-1">
            <ProductsFilter />
          </div>
          <div className="lg:col-span-3">
            <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
              <ProductsList category={params.slug} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
