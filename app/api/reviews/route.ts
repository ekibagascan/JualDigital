import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

function productIdFrom(searchParams: URLSearchParams, body?: Record<string, unknown>) {
  const fromQuery =
    searchParams.get('product_id') ||
    searchParams.get('productId') ||
    searchParams.get('productID')
  if (fromQuery) return fromQuery
  if (!body) return ''
  const value = body.product_id ?? body.productId ?? body.productID
  return typeof value === 'string' ? value : ''
}

function commentFrom(body: Record<string, unknown>) {
  const value = body.comment ?? body.content
  return typeof value === 'string' ? value.trim() : ''
}

type ReviewRow = {
  id: string
  product_id?: string
  user_id: string
  rating: number
  content?: string | null
  comment?: string | null
  created_at?: string
  helpful_count?: number
  not_helpful_count?: number
}

function mapReview(
  review: ReviewRow,
  profile: { name?: string | null; avatar_url?: string | null } | undefined,
  productId: string
) {
  const text = review.content || review.comment || null
  const name = profile?.name || 'Pembeli'
  const avatar = profile?.avatar_url || null
  return {
    id: review.id,
    product_id: review.product_id || productId,
    user_id: review.user_id,
    rating: review.rating,
    comment: text,
    content: text,
    created_at: review.created_at,
    helpful_count: review.helpful_count ?? 0,
    not_helpful_count: review.not_helpful_count ?? 0,
    user_name: name,
    user_avatar: avatar,
    profiles: { name, avatar_url: avatar },
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = productIdFrom(searchParams)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 50)
    const offset = (page - 1) * limit

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required', message: 'ID produk wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = serviceRoleClient()

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        product_id,
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
      console.error('[API/REVIEWS] Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews from database', details: error.message },
        { status: 500 }
      )
    }

    const userIds = reviews?.map((review) => review.user_id) || []
    let profiles: { id: string; name: string; avatar_url: string | null }[] = []

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('[API/REVIEWS] Profiles query error:', profilesError)
      } else {
        profiles = profilesData || []
      }
    }

    const processedReviews = (reviews || []).map((review) => {
      const userProfile = profiles.find((profile) => profile.id === review.user_id)
      return mapReview(review, userProfile, productId)
    })

    const ratingSum = processedReviews.reduce((sum, review) => sum + (review.rating || 0), 0)
    const averageRating =
      processedReviews.length > 0 ? ratingSum / processedReviews.length : 0

    return NextResponse.json({
      success: true,
      reviews: processedReviews,
      rating: averageRating,
      total_reviews: processedReviews.length,
    })
  } catch (error) {
    console.error('[REVIEWS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const user = await getUserFromRequest(request)
    const bodyUserId = typeof body.userId === 'string' ? body.userId : ''
    const userId = user?.id || bodyUserId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan untuk menulis ulasan' },
        { status: 401 }
      )
    }
    const productId = productIdFrom(new URL(request.url).searchParams, body)
    const rating = Number(body.rating)
    const content = commentFrom(body)

    if (!productId || !rating || !content) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Rating dan ulasan wajib diisi' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5', message: 'Rating harus 1 sampai 5' },
        { status: 400 }
      )
    }

    const supabase = serviceRoleClient()

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    if (productError) {
      if (productError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found', message: 'Produk tidak ditemukan' },
          { status: 404 }
        )
      }
      console.error('[API/REVIEWS] Error fetching product:', productError)
      return NextResponse.json(
        { error: 'Failed to fetch product information' },
        { status: 500 }
      )
    }

    if (product.seller_id === userId) {
      return NextResponse.json(
        { error: 'You cannot review your own product', message: 'Kamu tidak bisa mengulas produk sendiri' },
        { status: 403 }
      )
    }

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
      return NextResponse.json(
        { error: 'You have already reviewed this product', message: 'Kamu sudah mengulas produk ini' },
        { status: 409 }
      )
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: userId,
        rating,
        content,
        status: 'active',
        helpful_count: 0,
        not_helpful_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[API/REVIEWS] Error creating review:', error)
      return NextResponse.json(
        { error: 'Failed to create review', message: 'Gagal mengirim ulasan' },
        { status: 500 }
      )
    }

    const mapped = mapReview(
      review,
      {
        name: typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : null,
        avatar_url: typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      },
      productId
    )

    return NextResponse.json({
      success: true,
      review: mapped,
    })
  } catch (error) {
    console.error('[API/REVIEWS] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
