import Link from "next/link"
import { Book, Palette, Music, Code, Video, FileText, Camera, Gamepad2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const categories = [
  {
    name: "E-book",
    slug: "ebook",
    icon: Book,
    count: 2543,
    description: "Buku digital berbagai topik dan genre",
    color: "bg-blue-500",
  },
  {
    name: "Template",
    slug: "template",
    icon: Palette,
    count: 1876,
    description: "Template design, website, dan presentasi",
    color: "bg-purple-500",
  },
  {
    name: "Musik & Audio",
    slug: "music",
    icon: Music,
    count: 1234,
    description: "Musik, sound effect, dan audio digital",
    color: "bg-green-500",
  },
  {
    name: "Software & Tools",
    slug: "software",
    icon: Code,
    count: 856,
    description: "Aplikasi, plugin, dan tools digital",
    color: "bg-orange-500",
  },
  {
    name: "Kursus Online",
    slug: "course",
    icon: Video,
    count: 642,
    description: "Video tutorial dan kursus pembelajaran",
    color: "bg-red-500",
  },
  {
    name: "Dokumen Bisnis",
    slug: "document",
    icon: FileText,
    count: 423,
    description: "Template dokumen dan form bisnis",
    color: "bg-teal-500",
  },
  {
    name: "Fotografi",
    slug: "photography",
    icon: Camera,
    count: 312,
    description: "Preset, action, dan resource fotografi",
    color: "bg-pink-500",
  },
  {
    name: "Game Assets",
    slug: "game",
    icon: Gamepad2,
    count: 198,
    description: "Asset dan resource untuk game development",
    color: "bg-indigo-500",
  },
]

export function CategoriesGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category) => {
        const Icon = category.icon
        return (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 ${category.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                    <p className="text-sm text-primary font-medium mb-2">
                      {category.count.toLocaleString("id-ID")} produk
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
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
