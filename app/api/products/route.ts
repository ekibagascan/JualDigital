import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** CDN/edge can cache public catalog briefly to cut Supabase egress. */
export const revalidate = 60

/** Columns needed for cards/lists — avoid long_description, file_url, images blobs, etc. */
const LIST_COLUMNS =
  'id, title, description, price, original_price, image_url, category, tags, seller_id, status, rating, total_sales, total_reviews, featured, created_at, delivery_method, product_type, live_preview, telegram_enabled, telegram_plan_code, telegram_stars_price'

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function jsonCached(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

function applySort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: string
) {
  switch (sort) {
    case 'price-low':
      return query.order('price', { ascending: true })
    case 'price-high':
      return query.order('price', { ascending: false })
    case 'rating':
      return query.order('rating', { ascending: false })
    case 'popular':
      return query.order('total_sales', { ascending: false })
    case 'newest':
    default:
      return query.order('created_at', { ascending: false })
  }
}

async function fetchSellerNames(
  supabase: ReturnType<typeof supabaseAnon>,
  sellerIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(sellerIds.filter(Boolean)))
  if (unique.length === 0) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, business_name')
    .in('id', unique)
  if (error || !data) return {}
  const map: Record<string, string> = {}
  for (const s of data) {
    map[s.id] = s.business_name || s.name || 'Seller'
  }
  return map
}

async function getFeaturedFilled(
  supabase: ReturnType<typeof supabaseAnon>,
  limit: number,
  includeProductType: boolean
) {
  const cols = includeProductType ? LIST_COLUMNS : LIST_COLUMNS.replace(', product_type', '')

  const { data: featured, error: featuredError } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .eq('featured', true)
    .order('total_sales', { ascending: false })
    .order('rating', { ascending: false })
    .limit(limit)

  if (featuredError) throw featuredError

  const featuredList = featured || []
  if (featuredList.length >= limit) {
    return featuredList.slice(0, limit)
  }

  const remaining = limit - featuredList.length
  const { data: top, error: topError } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .eq('featured', false)
    .gte('rating', 3.5)
    .order('total_sales', { ascending: false })
    .order('rating', { ascending: false })
    .limit(remaining)

  if (topError) throw topError

  return [...featuredList, ...(top || [])].slice(0, limit)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || ''
    const q = searchParams.get('q')?.trim() || searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const productType =
      searchParams.get('type')?.trim() ||
      searchParams.get('product_type')?.trim() ||
      ''
    const sort = searchParams.get('sort') || 'newest'
    const featuredOnly = searchParams.get('featured') === 'true'
    const includeSellers = searchParams.get('include_sellers') === '1'
    const priceMin = searchParams.get('price_min')
    const priceMax = searchParams.get('price_max')
    const minRating = searchParams.get('min_rating')
    const categoriesParam = searchParams.get('categories')
    const excludeId = searchParams.get('exclude_id')?.trim() || ''

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      48,
      Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24)
    )
    const offsetParam = searchParams.get('offset')
    const offset =
      offsetParam != null
        ? Math.max(0, parseInt(offsetParam, 10) || 0)
        : (page - 1) * limit

    const supabase = supabaseAnon()
    let includeProductType = true

    const runList = async (withType: boolean) => {
      const cols = withType ? LIST_COLUMNS : LIST_COLUMNS.replace(', product_type', '')

      if (mode === 'featured') {
        const products = await getFeaturedFilled(supabase, limit, withType)
        return { products, count: products.length }
      }

      let query = supabase
        .from('products')
        .select(cols, { count: 'exact' })
        .eq('status', 'active')

      if (q) {
        query = query.or(
          `title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`
        )
      }
      if (category) query = query.eq('category', category)
      if (withType && productType) query = query.eq('product_type', productType)
      if (featuredOnly) query = query.eq('featured', true)
      if (excludeId) query = query.neq('id', excludeId)
      if (priceMin) query = query.gte('price', Number(priceMin))
      if (priceMax) query = query.lte('price', Number(priceMax))
      if (minRating) query = query.gte('rating', Number(minRating))
      if (categoriesParam) {
        const cats = categoriesParam.split(',').map((c) => c.trim()).filter(Boolean)
        if (cats.length) query = query.in('category', cats)
      }

      query = applySort(query, sort)
      const { data, error, count } = await query.range(offset, offset + limit - 1)
      if (error) throw error
      return { products: data || [], count: count ?? 0 }
    }

    let result: { products: Record<string, unknown>[]; count: number }
    try {
      result = await runList(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/product_type/i.test(message)) {
        includeProductType = false
        result = await runList(false)
      } else {
        throw err
      }
    }

    const products = result.products.map((p) => ({
      ...p,
      product_type: includeProductType
        ? (p as { product_type?: string }).product_type || 'digital_product'
        : 'digital_product',
    }))

    let sellerNames: Record<string, string> | undefined
    if (includeSellers) {
      sellerNames = await fetchSellerNames(
        supabase,
        products.map((p) => (p as { seller_id?: string }).seller_id || '')
      )
    }

    return jsonCached({
      products,
      count: result.count,
      ...(sellerNames ? { sellerNames } : {}),
    })
  } catch (error) {
    console.error('[PRODUCTS API]', error)
    return NextResponse.json(
      {
        error: 'Gagal memuat produk',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
