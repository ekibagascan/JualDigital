import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET buyer service orders for the authenticated user */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('service_orders')
      .select(
        `
        *,
        service_packages:package_id (id, tier, title, price, delivery_days, revisions),
        products:product_id (id, title, image_url, seller_id, product_type)
      `
      )
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[MOBILE SERVICE ORDERS]', error)
      return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
    }

    const orders = (data || []).map((row) => {
      const product = row.products as { title?: string; image_url?: string } | null
      const pkg = row.service_packages as { title?: string; id?: string } | null
      return {
        ...row,
        product_title: product?.title || 'Jasa',
        product_image: product?.image_url || null,
        package_name: pkg?.title || null,
        package_id: row.package_id || pkg?.id || null,
        status: row.status === 'awaiting_requirements' ? 'pending' : row.status,
        raw_status: row.status,
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[MOBILE SERVICE ORDERS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
  }
}
