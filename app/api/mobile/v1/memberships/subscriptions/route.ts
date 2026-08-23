import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET membership subscriptions for the authenticated user */
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
      .from('subscriptions')
      .select(
        `
        *,
        products:product_id (
          id, title, description, image_url, price, seller_id, product_type, status
        ),
        membership_tiers:tier_id (
          id, name, description, price_monthly, price_yearly, perks, sort_order
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[MOBILE SUBSCRIPTIONS]', error)
      return NextResponse.json({ error: 'Gagal memuat langganan' }, { status: 500 })
    }

    return NextResponse.json({ subscriptions: data || [] })
  } catch (error) {
    console.error('[MOBILE SUBSCRIPTIONS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat langganan' }, { status: 500 })
  }
}
