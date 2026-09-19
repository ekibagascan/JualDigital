import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

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
    const userEmail = user.email?.toLowerCase() || null

    let query = supabase
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
      .order('created_at', { ascending: false })

    if (userEmail) {
      query = query.or(`user_id.eq.${user.id},guest_email.eq.${userEmail}`)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('[MOBILE ORDERS]', error)
      return NextResponse.json(
        { error: 'Gagal memuat pesanan', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orders: orders || [],
      count: orders?.length ?? 0,
    })
  } catch (error) {
    console.error('[MOBILE ORDERS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 })
  }
}
