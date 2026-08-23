"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Grid, List, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const SORT_OPTIONS = [
  { value: "popular", label: "Paling Populer" },
  { value: "newest", label: "Terbaru" },
  { value: "price-low", label: "Harga Termurah" },
  { value: "price-high", label: "Harga Tertinggi" },
  { value: "rating", label: "Rating Tertinggi" },
]

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

const TYPE_OPTIONS = [
  { value: "", label: "Semua jenis" },
  { value: "digital_product", label: "Produk digital" },
  { value: "service", label: "Jasa" },
  { value: "course", label: "Kursus" },
  { value: "membership", label: "Keanggotaan" },
]

export function ProductsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedSort = searchParams.get("sort") || "popular"
  const selectedType = searchParams.get("type") || ""
  const viewMode = searchParams.get("view") === "list" ? "list" : "grid"
  const [open, setOpen] = useState(false)

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
    } else {
      const key = `${min || "0"}-${max || "999999999"}`
      const matched = PRICE_OPTIONS.find((option) => option.id === key)
      setSelectedPrice(matched ? matched.id : "all")
    }
    setSelectedCategories(searchParams.get("categories")?.split(",").filter(Boolean) || [])
    setSelectedRating(searchParams.get("ratings") || "")
  }, [searchParams])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await fetch("/api/categories")
        const categoriesData = await categoriesResponse.json()
        if (categoriesData.success) {
          setCategories(categoriesData.categories)
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", sort)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type) params.set("type", type)
    else params.delete("type")
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const handleViewModeChange = (mode: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", mode)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let nextCategories
    if (checked) {
      nextCategories = [...selectedCategories, categoryId]
    } else {
      nextCategories = selectedCategories.filter((id) => id !== categoryId)
    }
    setSelectedCategories(nextCategories)
  }

  const handleRatingChange = (ratingId: string, checked: boolean) => {
    if (!checked) {
      setSelectedRating("")
      return
    }
    setSelectedRating(ratingId)
  }

  const applyAdvancedFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (selectedPrice === "all") {
      params.delete("price_min")
      params.delete("price_max")
    } else {
      const [min, max] = selectedPrice.split("-")
      params.set("price_min", min)
      params.set("price_max", max)
    }

    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","))
    } else {
      params.delete("categories")
    }

    if (selectedRating) {
      params.set("ratings", selectedRating)
    } else {
      params.delete("ratings")
    }

    router.push(`${window.location.pathname}?${params.toString()}`)
    setOpen(false)
  }

  const resetAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", "popular")
    params.set("view", "grid")
    params.delete("price_min")
    params.delete("price_max")
    params.delete("categories")
    params.delete("ratings")
    params.delete("type")

    setSelectedPrice("all")
    setSelectedCategories([])
    setSelectedRating("")

    router.push(`${window.location.pathname}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <div className="space-y-3">
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TYPE_OPTIONS.map((option) => (
        <Button
          key={option.value || "all-types"}
          type="button"
          size="sm"
          variant={selectedType === option.value ? "default" : "outline"}
          onClick={() => handleTypeChange(option.value)}
          className="whitespace-nowrap rounded-xl"
        >
          {option.label}
        </Button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selectedSort === option.value ? "default" : "outline"}
              onClick={() => handleSortChange(option.value)}
              className="whitespace-nowrap rounded-xl"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="rounded-xl shrink-0 bg-background">
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Filter Produk</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Harga</Label>
              <div className="flex flex-wrap gap-2">
                {PRICE_OPTIONS.map((option) => (
                  <button key={option.id} type="button" onClick={() => setSelectedPrice(option.id)} className="focus:outline-none">
                    <Badge variant={selectedPrice === option.id ? "default" : "secondary"}>{option.label}</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Kategori</Label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                  ))
                ) : (
                  categories.map((category) => (
                    <div key={category.slug} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.slug}
                        checked={selectedCategories.includes(category.slug)}
                        onCheckedChange={(checked) => handleCategoryChange(category.slug, checked as boolean)}
                      />
                      <Label htmlFor={category.slug} className="text-sm flex-1 cursor-pointer flex items-center justify-between">
                        <span>{category.name}</span>
                        <span className="text-muted-foreground">({category.count.toLocaleString("id-ID")})</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>

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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetAllFilters}>
                Reset
              </Button>
              <Button type="button" onClick={applyAdvancedFilters}>
                Terapkan Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex border rounded-lg shrink-0">
        <Button
          type="button"
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleViewModeChange("grid")}
          className="rounded-r-none"
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleViewModeChange("list")}
          className="rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
    </div>
  )
}
