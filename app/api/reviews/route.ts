import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 10
    const offset = (page - 1) * limit

    console.log('[API/REVIEWS] Received request for productId:', productId, 'page:', page);

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Use service role key to bypass RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[REVIEWS API] Fetching reviews for product:', productId)

    // First, get the reviews with pagination
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        helpful_count,
        not_helpful_count,
        user_id
      `)
      .eq('product_id', productId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[API/REVIEWS] Supabase query error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews from database', details: error.message }, { status: 500 })
    }

    // Then, get the user profiles for the reviews
    const userIds = reviews?.map(review => review.user_id) || []
    let profiles: { id: string; name: string; avatar_url: string | null }[] = []
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds)
      
      if (profilesError) {
        console.error('[API/REVIEWS] Profiles query error:', profilesError);
      } else {
        profiles = profilesData || []
      }
    }

    console.log('[REVIEWS API] Reviews query result:', { reviews, error })
    console.log('[REVIEWS API] Profiles data:', profiles)

    // Process reviews to include profile data
    const processedReviews = reviews?.map((review) => {
      const userProfile = profiles.find(profile => profile.id === review.user_id)
      return {
        ...review,
        profiles: userProfile || { name: 'User', avatar_url: null }
      }
    }) || []

    return NextResponse.json({
      success: true,
      reviews: processedReviews
    })
  } catch (error) {
    console.error('[REVIEWS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, rating, content, userId } = body

    if (!productId || !rating || !content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Use service role key to bypass RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[API/REVIEWS] Creating review:', { productId, rating, content, userId })

    // Check if user is the seller of this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    if (productError) {
      // PGRST116 means product not found
      if (productError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      console.error('[API/REVIEWS] Error fetching product:', productError)
      return NextResponse.json({ error: 'Failed to fetch product information' }, { status: 500 })
    }

    if (product.seller_id === userId) {
      return NextResponse.json({ error: 'You cannot review your own product' }, { status: 403 })
    }

    // Check if user has already reviewed this product
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[API/REVIEWS] Error checking existing review:', checkError)
      return NextResponse.json({ error: 'Failed to check existing review' }, { status: 500 })
    }

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 })
    }

    // Create the review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: userId,
        rating,
        content,
        status: 'active',
        helpful_count: 0,
        not_helpful_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('[API/REVIEWS] Error creating review:', error)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    console.log('[API/REVIEWS] Review created successfully:', review)

    return NextResponse.json({
      success: true,
      review
    })
  } catch (error) {
    console.error('[API/REVIEWS] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 