import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SearchResults } from "@/components/search/search-results"

interface SearchPageProps {
  searchParams: {
    q?: string
    category?: string
    sort?: string
    price_min?: string
    price_max?: string
  }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ""

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{query ? `Hasil pencarian untuk "${query}"` : "Pencarian Produk"}</h1>
          {query && <p className="text-muted-foreground">Menampilkan produk yang cocok dengan pencarian Anda</p>}
        </div>

        <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
