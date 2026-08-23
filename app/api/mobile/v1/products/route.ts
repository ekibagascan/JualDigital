import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || searchParams.get('per_page') || '20', 10) || 20)
    )
    const offset = (page - 1) * limit
    const sort = searchParams.get('sort') || 'newest'
    const sellerId = searchParams.get('seller_id')?.trim() || ''
    const featured = searchParams.get('featured') === 'true'

    const supabase = serviceRoleClient()

    let query = supabase
      .from('products')
      .select(
        'id, title, description, price, original_price, image_url, images, category, tags, seller_id, status, product_type, rating, total_sales, total_reviews, featured, created_at, delivery_method',
        { count: 'exact' }
      )
      .eq('status', 'active')

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (type) {
      query = query.eq('product_type', type)
    }
    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }
    if (featured) {
      query = query.eq('featured', true)
    }

    switch (sort) {
      case 'price-low':
        query = query.order('price', { ascending: true })
        break
      case 'price-high':
        query = query.order('price', { ascending: false })
        break
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'popular':
        query = query.order('total_sales', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[MOBILE PRODUCTS] Error:', error)
      return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
    }

    return NextResponse.json({
      products: data || [],
      count: count ?? 0,
    })
  } catch (error) {
    console.error('[MOBILE PRODUCTS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
  }
}
