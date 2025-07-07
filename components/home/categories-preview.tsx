import Link from "next/link"
import { Book, Palette, Music, Code, Video, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const categories = [
  {
    name: "E-book",
    slug: "ebook",
    icon: Book,
    count: "2,500+",
    description: "Buku digital berbagai topik",
  },
  {
    name: "Template",
    slug: "template",
    icon: Palette,
    count: "1,800+",
    description: "Template design dan website",
  },
  {
    name: "Musik",
    slug: "music",
    icon: Music,
    count: "1,200+",
    description: "Audio dan musik digital",
  },
  {
    name: "Software",
    slug: "software",
    icon: Code,
    count: "800+",
    description: "Aplikasi dan tools digital",
  },
  {
    name: "Kursus",
    slug: "course",
    icon: Video,
    count: "600+",
    description: "Kursus online dan tutorial",
  },
  {
    name: "Dokumen",
    slug: "document",
    icon: FileText,
    count: "400+",
    description: "Template dokumen bisnis",
  },
]

export function CategoriesPreview() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Jelajahi Kategori</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan produk digital sesuai kebutuhan Anda dari berbagai kategori
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Link key={category.slug} href={`/categories/${category.slug}`}>
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-sm text-primary font-medium mb-2">{category.count}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
