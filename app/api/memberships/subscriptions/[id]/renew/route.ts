import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { computePeriod } from '@/lib/subscription-billing'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const months = body.period_months === 12 ? 12 : Number(body.period_months) || 1
    const { payment_confirmed, order_id } = body

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

    // MVP: require payment confirmation OR allow extend for testing with payment_confirmed
    if (!payment_confirmed) {
      return NextResponse.json({
        needs_payment: true,
        message: 'Pembayaran diperlukan untuk memperpanjang langganan',
        renew_intent: {
          subscription_id: params.id,
          product_id: sub.product_id,
          tier_id: sub.tier_id,
          period_months: months,
        },
      })
    }

    if (order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, user_id, status')
        .eq('id', order_id)
        .single()
      if (!order || order.user_id !== user.id || String(order.status).toLowerCase() !== 'paid') {
        return NextResponse.json({ error: 'Pesanan pembayaran tidak valid' }, { status: 400 })
      }
    }

    // Extend from current period end if still active, else from now
    const base = new Date(sub.current_period_end)
    const startFrom = base > new Date() ? base : new Date()
    const periodEnd = new Date(startFrom)
    periodEnd.setMonth(periodEnd.getMonth() + months)
    const { periodStart } = computePeriod(months)

    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: (base > new Date() ? new Date(sub.current_period_start) : periodStart).toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        external_payment_ref: order_id || sub.external_payment_ref,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[MEMBERSHIP RENEW]', updateError)
      return NextResponse.json({ error: 'Gagal memperpanjang langganan' }, { status: 500 })
    }

    await supabase.from('subscription_events').insert({
      subscription_id: params.id,
      event_type: 'renewed',
      meta: { period_months: months, order_id: order_id || null },
    })

    return NextResponse.json({
      success: true,
      message: 'Langganan berhasil diperpanjang',
      subscription: updated,
    })
  } catch (error) {
    console.error('[MEMBERSHIP RENEW] Error:', error)
    return NextResponse.json({ error: 'Gagal memperpanjang langganan' }, { status: 500 })
  }
}
