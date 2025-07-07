"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function ProductsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [priceRange, setPriceRange] = useState([
    Number.parseInt(searchParams.get("price_min") || "0"),
    Number.parseInt(searchParams.get("price_max") || "1000000"),
  ])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || [],
  )
  const [selectedRatings, setSelectedRatings] = useState<string[]>(
    searchParams.get("ratings")?.split(",").filter(Boolean) || [],
  )

  const categories = [
    { id: "ebook", name: "E-book", count: 2543 },
    { id: "template", name: "Template", count: 1876 },
    { id: "music", name: "Musik & Audio", count: 1234 },
    { id: "software", name: "Software", count: 856 },
    { id: "course", name: "Kursus Online", count: 642 },
    { id: "document", name: "Dokumen", count: 423 },
  ]

  const ratings = [
    { id: "5", name: "5 Bintang", count: 1234 },
    { id: "4", name: "4+ Bintang", count: 2345 },
    { id: "3", name: "3+ Bintang", count: 3456 },
  ]

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
    let newRatings
    if (checked) {
      newRatings = [...selectedRatings, ratingId]
    } else {
      newRatings = selectedRatings.filter((id) => id !== ratingId)
    }
    setSelectedRatings(newRatings)
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Update price range
    params.set("price_min", priceRange[0].toString())
    params.set("price_max", priceRange[1].toString())

    // Update categories
    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","))
    } else {
      params.delete("categories")
    }

    // Update ratings
    if (selectedRatings.length > 0) {
      params.set("ratings", selectedRatings.join(","))
    } else {
      params.delete("ratings")
    }

    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setPriceRange([0, 1000000])
    setSelectedCategories([])
    setSelectedRatings([])

    // Clear URL params
    const params = new URLSearchParams(searchParams.toString())
    params.delete("price_min")
    params.delete("price_max")
    params.delete("categories")
    params.delete("ratings")

    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filter</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Rentang Harga</Label>
          <div className="px-2">
            <Slider value={priceRange} onValueChange={setPriceRange} max={1000000} step={10000} className="mb-4" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Rp {priceRange[0].toLocaleString("id-ID")}</span>
              <span>Rp {priceRange[1].toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Kategori</Label>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                />
                <Label
                  htmlFor={category.id}
                  className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                >
                  <span>{category.name}</span>
                  <span className="text-muted-foreground">({category.count.toLocaleString("id-ID")})</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ratings */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Rating</Label>
          <div className="space-y-3">
            {ratings.map((rating) => (
              <div key={rating.id} className="flex items-center space-x-2">
                <Checkbox
                  id={rating.id}
                  checked={selectedRatings.includes(rating.id)}
                  onCheckedChange={(checked) => handleRatingChange(rating.id, checked as boolean)}
                />
                <Label htmlFor={rating.id} className="text-sm flex-1 cursor-pointer flex items-center justify-between">
                  <span>{rating.name}</span>
                  <span className="text-muted-foreground">({rating.count.toLocaleString("id-ID")})</span>
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
