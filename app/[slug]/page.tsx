import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { StorePage } from "@/components/store/store-page"
import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"

interface SlugPageProps {
    params: {
        slug: string
    }
}

export default async function SellerSlugPage({ params }: SlugPageProps) {
    const { slug } = params

    // Look up seller by slug
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .eq('role', 'seller')
        .single()

    if (!profile) {
        notFound()
    }

    // Reuse the existing StorePage component with the seller's UUID
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                <StorePage sellerId={profile.id} />
            </main>
            <Footer />
        </div>
    )
}
