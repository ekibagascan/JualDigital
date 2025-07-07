import { Book, Palette, Music, Code, Video, FileText } from "lucide-react"

const iconMap = {
  Book,
  Palette,
  Music,
  Code,
  Video,
  FileText,
}

interface CategoryHeaderProps {
  category: {
    name: string
    description: string
    icon: string
    totalProducts: number
  }
}

export function CategoryHeader({ category }: CategoryHeaderProps) {
  const Icon = iconMap[category.icon as keyof typeof iconMap] || Book

  return (
    <div className="text-center py-12 bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-lg">
      <div className="mb-6 flex justify-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <Icon className="h-12 w-12 text-primary" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">{category.description}</p>
      <p className="text-sm text-muted-foreground">{category.totalProducts.toLocaleString("id-ID")} produk tersedia</p>
    </div>
  )
}
