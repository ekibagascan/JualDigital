import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const supabase = serviceRoleClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          id,
          order_id,
          product_id,
          seller_id,
          product_title,
          price,
          quantity,
          seller_earnings,
          products:product_id (
            title,
            image_url
          )
        )
      `
      )
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      console.error('[MOBILE ORDER DETAIL]', error)
      return NextResponse.json(
        { error: 'Gagal memuat pesanan', details: error.message },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    const ownsByUser = order.user_id === user.id
    const ownsByEmail =
      !!user.email &&
      !!order.guest_email &&
      order.guest_email.toLowerCase() === user.email.toLowerCase()

    if (!ownsByUser && !ownsByEmail) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke pesanan ini' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('[MOBILE ORDER DETAIL] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 })
  }
}
