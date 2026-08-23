import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CoursePlayer } from "@/components/courses/course-player"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { productId: string }
}

export default function BelajarPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-6">
        <CoursePlayer productId={params.productId} />
      </main>
      <Footer />
    </div>
  )
}
