import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { periodVoucherAdapter } from '@/lib/subscription-billing'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const supabase = serviceRoleClient()

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !sub) {
      return NextResponse.json({ error: 'Langganan tidak ditemukan' }, { status: 404 })
    }
    if (sub.user_id !== user.id) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke langganan ini' }, { status: 403 })
    }
    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Langganan tidak aktif' }, { status: 400 })
    }

    await periodVoucherAdapter.cancelAtPeriodEnd()

    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[MEMBERSHIP CANCEL]', updateError)
      return NextResponse.json({ error: 'Gagal membatalkan langganan' }, { status: 500 })
    }

    await supabase.from('subscription_events').insert({
      subscription_id: params.id,
      event_type: 'cancel_at_period_end',
      meta: {},
    })

    return NextResponse.json({
      success: true,
      message: 'Langganan akan berakhir di akhir periode berjalan.',
      subscription: updated,
    })
  } catch (error) {
    console.error('[MEMBERSHIP CANCEL] Error:', error)
    return NextResponse.json({ error: 'Gagal membatalkan langganan' }, { status: 500 })
  }
}
