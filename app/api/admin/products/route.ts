import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    console.log('[ADMIN PRODUCTS API] ===== API CALLED =====')

    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // Get all products first
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('[ADMIN PRODUCTS API] Products query error:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Get all profiles to map seller information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('[ADMIN PRODUCTS API] Profiles query error:', profilesError)
    }

    // Get order items data to calculate sales and revenue
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity, seller_earnings, created_at')

    if (orderItemsError) {
      console.error('[ADMIN PRODUCTS API] Order items query error:', orderItemsError)
    }

    // Get reviews data for ratings
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('product_id, rating, created_at')

    if (reviewsError) {
      console.error('[ADMIN PRODUCTS API] Reviews query error:', reviewsError)
    }

    // Calculate stats
    const totalProducts = products?.length || 0
    const activeProducts = products?.filter(product => product.status === 'active').length || 0
    const pendingProducts = products?.filter(product => product.status === 'pending').length || 0
    const rejectedProducts = products?.filter(product => product.status === 'rejected').length || 0

    // Calculate total sales and revenue
    const totalSales = orderItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const totalRevenue = orderItems?.reduce((sum, item) => sum + (parseFloat(item.seller_earnings) || 0), 0) || 0

    // Process product data with additional statistics
    const processedProducts = products?.map(product => {
      // Find seller information
      const seller = profiles?.find(profile => profile.id === product.seller_id)
      
      // Calculate product's sales statistics
      const productOrderItems = orderItems?.filter(item => item.product_id === product.id) || []
      const totalSold = productOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
      const productRevenue = productOrderItems.reduce((sum, item) => sum + (parseFloat(item.seller_earnings) || 0), 0)

      // Calculate product's rating
      const productReviews = reviews?.filter(review => review.product_id === product.id) || []
      const averageRating = productReviews.length > 0 
        ? productReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / productReviews.length 
        : 0

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: parseFloat(product.price) || 0,
        category: product.category,
        status: product.status || 'pending',
        image_url: product.image_url,
        created_at: product.created_at,
        updated_at: product.updated_at,
        seller_id: product.seller_id,
        author: seller?.name || 'Unknown Author',
        authorEmail: seller?.email || 'No email',
        authorAvatar: seller?.avatar_url,
        totalSold,
        revenue: productRevenue,
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviews: productReviews.length,
        // For variants, we'll use the main price for now
        variants: [
          { name: "Standard", price: parseFloat(product.price) || 0 }
        ]
      }
    }) || []

    return NextResponse.json({
      products: processedProducts,
      stats: {
        totalProducts,
        activeProducts,
        pendingProducts,
        rejectedProducts,
        totalSales,
        totalRevenue
      }
    })

  } catch (error) {
    console.error('[ADMIN PRODUCTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 