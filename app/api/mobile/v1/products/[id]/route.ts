import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { serviceRoleClient } from '@/lib/mobile-auth'

const BASE_COLUMNS =
  'id, title, description, price, original_price, image_url, images, category, tags, seller_id, status, rating, total_sales, total_reviews, featured, created_at, delivery_method, long_description, file_url, download_link, live_preview, file_size, format, pages, language, license'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'ID produk wajib' }, { status: 400 })
    }

    const supabase = serviceRoleClient()

    const run = async (includeProductType: boolean) => {
      return supabase
        .from('products')
        .select(includeProductType ? `${BASE_COLUMNS}, product_type` : BASE_COLUMNS)
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle()
    }

    let includeType = true
    let { data, error } = await run(true)

    if (error && /product_type/i.test(error.message || '')) {
      console.warn('[MOBILE PRODUCT DETAIL] product_type missing — falling back')
      includeType = false
      ;({ data, error } = await run(false))
    }

    if (error) {
      console.error('[MOBILE PRODUCT DETAIL]', error)
      return NextResponse.json(
        { error: 'Gagal memuat produk', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    let sellerName: string | null = null
    let sellerLogo: string | null = null
    if (data.seller_id) {
      const { data: seller } = await supabase
        .from('profiles')
        .select('name, business_name, shop_logo, avatar_url')
        .eq('id', data.seller_id)
        .maybeSingle()
      sellerName = seller?.business_name || seller?.name || null
      sellerLogo = seller?.shop_logo || seller?.avatar_url || null
    }

    const product = {
      ...data,
      product_type: includeType
        ? (data as { product_type?: string }).product_type || 'digital_product'
        : 'digital_product',
      seller_name: sellerName,
      seller_logo: sellerLogo,
      total_views: 0,
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[MOBILE PRODUCT DETAIL] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
  }
}
