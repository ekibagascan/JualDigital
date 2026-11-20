import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { serviceRoleClient } from '@/lib/mobile-auth'
import { isHiddenCatalogProduct } from '@/lib/content-policy'

/** GET service packages for a jasa product */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = serviceRoleClient()
    const fullProduct = await supabase
      .from('products')
      .select('id, title, description, long_description, category, tags, status')
      .eq('id', params.id)
      .maybeSingle()

    const productResult =
      fullProduct.error && /column|schema cache/i.test(fullProduct.error.message || '')
        ? await supabase
            .from('products')
            .select('id, title, description, category, status')
            .eq('id', params.id)
            .maybeSingle()
        : fullProduct
    const product = productResult.data

    if (!product || product.status !== 'active' || isHiddenCatalogProduct(product)) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('service_packages')
      .select('id, product_id, tier, title, description, price, delivery_days, revisions, features, sort_order')
      .eq('product_id', params.id)
      .order('sort_order', { ascending: true })

    if (error) {
      if (/service_packages|does not exist|schema cache/i.test(error.message || '')) {
        return NextResponse.json({ packages: [] })
      }
      console.error('[MOBILE PACKAGES]', error)
      return NextResponse.json({ error: 'Gagal memuat paket jasa' }, { status: 500 })
    }

    const packages = (data || []).map((p) => ({
      ...p,
      name: p.title,
      delivery_days: p.delivery_days,
    }))

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('[MOBILE PACKAGES] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat paket jasa' }, { status: 500 })
  }
}
