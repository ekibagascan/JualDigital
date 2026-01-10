import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await req.cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Cookies are set via response object in route handlers, not here
          },
        },
      }
    )

    // Get rating statistics from products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('rating')
      .eq('status', 'active')

    if (productsError) {
      console.error('Error fetching products for rating stats:', productsError)
      return NextResponse.json({ error: 'Failed to fetch rating statistics' }, { status: 500 })
    }

    // Calculate rating counts
    const ratingCounts = {
      '5': 0, // 5 stars
      '4': 0, // 4+ stars
      '3': 0, // 3+ stars
    }

    products?.forEach(product => {
      const rating = product.rating || 0
      if (rating >= 5) ratingCounts['5']++
      if (rating >= 4) ratingCounts['4']++
      if (rating >= 3) ratingCounts['3']++
    })

    // Get price range
    const { data: priceData, error: priceError } = await supabase
      .from('products')
      .select('price')
      .eq('status', 'active')

    if (priceError) {
      console.error('Error fetching price data:', priceError)
    }

    const prices = priceData?.map(p => p.price || 0) || []
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 1000000

    return NextResponse.json({
      success: true,
      ratingCounts,
      priceRange: {
        min: minPrice,
        max: maxPrice
      }
    })

  } catch (error) {
    console.error('Error in GET /api/products/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 