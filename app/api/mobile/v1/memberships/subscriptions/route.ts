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

    const subscriptions = (data || []).map((row) => {
      const product = row.products as { title?: string; image_url?: string } | null
      const tier = row.membership_tiers as { name?: string; id?: string } | null
      return {
        ...row,
        product_id: row.product_id,
        product_title: product?.title || 'Keanggotaan',
        product_image: product?.image_url || null,
        tier_id: row.tier_id || tier?.id || null,
        tier_name: tier?.name || null,
        renews_at: row.current_period_end || row.renews_at || null,
      }
    })

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('[MOBILE SUBSCRIPTIONS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat langganan' }, { status: 500 })
  }
}
