import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(
  req: NextRequest,
  { params }: { params: { sellerId: string } }
) {
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

    const sellerId = params.sellerId

    // Get seller profile
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Get seller's products count
    const { count: productsCount, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'active')

    if (productsError) {
      console.error('Error counting products:', productsError)
    }

    // Get seller's total sales from order items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        seller_earnings,
        orders!inner(
          status
        )
      `)
      .eq('seller_id', sellerId)
      .eq('orders.status', 'paid')

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError)
    }

    // Calculate total sales and revenue
    const totalSales = orderItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const totalRevenue = orderItems?.reduce((sum, item) => sum + (item.seller_earnings || 0), 0) || 0

    // Get average rating from reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        rating,
        products!inner(
          seller_id
        )
      `)
      .eq('products.seller_id', sellerId)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
    }

    const totalReviews = reviews?.length || 0
    const averageRating = reviews && reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0

    // Update seller profile with calculated stats
    const updatedSeller = {
      ...seller,
      total_products: productsCount || 0,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      total_reviews: totalReviews
    }

    return NextResponse.json({
      seller: updatedSeller,
      stats: {
        totalProducts: productsCount || 0,
        totalSales,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews
      }
    })

  } catch (error) {
    console.error('Error in GET /api/seller/[sellerId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 