"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  uuid: string
  name: string
  slug: string
  count: number
}

const PRICE_OPTIONS = [
  { id: "all", label: "Semua Harga" },
  { id: "0-50000", label: "< Rp 50rb" },
  { id: "50000-200000", label: "Rp 50rb - 200rb" },
  { id: "200000-500000", label: "Rp 200rb - 500rb" },
  { id: "500000-999999999", label: "> Rp 500rb" },
]

const RATING_OPTIONS = [
  { id: "5", label: "5 Bintang" },
  { id: "4", label: "4+ Bintang" },
  { id: "3", label: "3+ Bintang" },
]

export function ProductsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedPrice, setSelectedPrice] = useState<string>("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || [],
  )
  const [selectedRating, setSelectedRating] = useState<string>(searchParams.get("ratings") || "")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const min = searchParams.get("price_min")
    const max = searchParams.get("price_max")
    if (!min && !max) {
      setSelectedPrice("all")
      return
    }
    const key = `${min || "0"}-${max || "999999999"}`
    const matched = PRICE_OPTIONS.find((option) => option.id === key)
    setSelectedPrice(matched ? matched.id : "all")
  }, [searchParams])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories')
        const categoriesData = await categoriesResponse.json()

        if (categoriesData.success) {
          setCategories(categoriesData.categories)
        } else {
          console.error('Failed to fetch categories:', categoriesData.error)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories
    if (checked) {
      newCategories = [...selectedCategories, categoryId]
    } else {
      newCategories = selectedCategories.filter((id) => id !== categoryId)
    }
    setSelectedCategories(newCategories)
  }

  const handleRatingChange = (ratingId: string, checked: boolean) => {
    if (!checked) {
      setSelectedRating("")
      return
    }
    setSelectedRating(ratingId)
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Update price range with simple presets
    if (selectedPrice === "all") {
      params.delete("price_min")
      params.delete("price_max")
    } else {
      const [min, max] = selectedPrice.split("-")
      params.set("price_min", min)
      params.set("price_max", max)
    }

    // Update categories
    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","))
    } else {
      params.delete("categories")
    }

    // Update rating
    if (selectedRating) {
      params.set("ratings", selectedRating)
    } else {
      params.delete("ratings")
    }

    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setSelectedPrice("all")
    setSelectedCategories([])
    setSelectedRating("")

    // Clear URL params
    const params = new URLSearchParams(searchParams.toString())
    params.delete("price_min")
    params.delete("price_max")
    params.delete("categories")
    params.delete("ratings")

    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  return (
    <Card className="mx-0 sm:mx-0">
      <CardHeader className="px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle>Filter</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-3 sm:px-6">
        {/* Price presets */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Harga</Label>
          <div className="flex flex-wrap gap-2">
            {PRICE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedPrice(option.id)}
                className="focus:outline-none"
              >
                <Badge variant={selectedPrice === option.id ? "default" : "secondary"}>{option.label}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Kategori</Label>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {loading ? (
              // Loading skeleton for categories
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-8 animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              categories.map((category) => (
                <div key={category.slug} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.slug}
                    checked={selectedCategories.includes(category.slug)}
                    onCheckedChange={(checked) => handleCategoryChange(category.slug, checked as boolean)}
                  />
                  <Label
                    htmlFor={category.slug}
                    className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span>{category.name}</span>
                    <span className="text-muted-foreground">({category.count.toLocaleString("id-ID")})</span>
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rating */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Minimal Rating</Label>
          <div className="space-y-2">
            {RATING_OPTIONS.map((rating) => (
              <div key={rating.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating.id}`}
                  checked={selectedRating === rating.id}
                  onCheckedChange={(checked) => handleRatingChange(rating.id, checked as boolean)}
                />
                <Label htmlFor={`rating-${rating.id}`} className="text-sm cursor-pointer">
                  {rating.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={applyFilters}>
          Terapkan Filter
        </Button>
      </CardContent>
    </Card>
  )
}
