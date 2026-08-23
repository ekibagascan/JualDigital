import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const role = request.nextUrl.searchParams.get('role') || 'buyer'
    if (role !== 'buyer' && role !== 'seller') {
      return NextResponse.json({ error: 'Parameter role harus buyer atau seller' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const column = role === 'seller' ? 'seller_id' : 'buyer_id'

    const { data, error } = await supabase
      .from('service_orders')
      .select(
        `
        *,
        service_packages:package_id (id, tier, title, price, delivery_days, revisions),
        products:product_id (id, title, image_url, seller_id)
      `
      )
      .eq(column, user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[SERVICES ORDERS] list', error)
      return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
    }

    return NextResponse.json({ orders: data || [] })
  } catch (error) {
    console.error('[SERVICES ORDERS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
  }
}
