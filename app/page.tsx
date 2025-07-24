import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ComingSoon } from "@/components/coming-soon"

// Original homepage components (commented out for maintenance)
// import { HeroSection } from "@/components/home/hero-section"
// import { FeaturedProducts } from "@/components/home/featured-products"
// import { CategoriesPreview } from "@/components/home/categories-preview"
// import { NewestProducts } from "@/components/home/newest-products"
// import { StatsSection } from "@/components/home/stats-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ComingSoon />

        {/* Original homepage content (commented out for maintenance)
        <HeroSection />
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted" />}>
          <FeaturedProducts />
        </Suspense>
        <CategoriesPreview />
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted" />}>
          <NewestProducts />
        </Suspense>
        <StatsSection />
        */}
      </main>
      <Footer />
    </div>
  )
}
