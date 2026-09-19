import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { serviceRoleClient } from '@/lib/mobile-auth'

const BASE_COLUMNS =
  'id, title, description, price, original_price, image_url, images, category, tags, seller_id, status, rating, total_sales, total_reviews, featured, created_at, delivery_method'

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

    const run = async (includeProductType: boolean) => {
      let query = supabase
        .from('products')
        .select(
          includeProductType ? `${BASE_COLUMNS}, product_type` : BASE_COLUMNS,
          { count: 'exact' }
        )
        .eq('status', 'active')

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      }
      if (category) {
        query = query.eq('category', category)
      }
      if (includeProductType && type) {
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

      return query.range(offset, offset + limit - 1)
    }

    let includeType = true
    let { data, error, count } = await run(true)

    // Backward compatible until migration add_product_types_* is applied
    if (error && /product_type/i.test(error.message || '')) {
      console.warn('[MOBILE PRODUCTS] product_type missing — falling back. Apply migration.')
      includeType = false
      ;({ data, error, count } = await run(false))
    }

    if (error) {
      console.error('[MOBILE PRODUCTS] Error:', error)
      return NextResponse.json(
        { error: 'Gagal memuat produk', details: error.message },
        { status: 500 }
      )
    }

    const products = (data || []).map((p) => ({
      ...p,
      product_type: includeType
        ? (p as { product_type?: string }).product_type || 'digital_product'
        : 'digital_product',
    }))

    return NextResponse.json({
      products,
      count: count ?? 0,
    })
  } catch (error) {
    console.error('[MOBILE PRODUCTS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
  }
}
