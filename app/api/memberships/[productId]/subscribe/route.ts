import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { periodVoucherAdapter } from '@/lib/subscription-billing'

async function activateSubscription(
  supabase: ReturnType<typeof serviceRoleClient>,
  opts: {
    userId: string
    productId: string
    tierId: string
    months: number
    orderId: string
  }
) {
  const period = await periodVoucherAdapter.createSubscription({
    userId: opts.userId,
    productId: opts.productId,
    tierId: opts.tierId,
    periodMonths: opts.months,
    externalPaymentRef: opts.orderId,
  })

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', opts.userId)
    .eq('product_id', opts.productId)
    .maybeSingle()

  let subscription
  if (existing) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        tier_id: opts.tierId,
        status: 'active',
        current_period_start: period.periodStart.toISOString(),
        current_period_end: period.periodEnd.toISOString(),
        cancel_at_period_end: false,
        external_payment_ref: opts.orderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    subscription = data
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: opts.userId,
        product_id: opts.productId,
        tier_id: opts.tierId,
        status: 'active',
        current_period_start: period.periodStart.toISOString(),
        current_period_end: period.periodEnd.toISOString(),
        cancel_at_period_end: false,
        external_payment_ref: opts.orderId,
      })
      .select()
      .single()
    if (error) throw error
    subscription = data
  }

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'activated',
    meta: { order_id: opts.orderId, period_months: opts.months },
  })

  return subscription
}

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const body = await request.json()
    const { tier_id, period_months, payment_confirmed, order_id } = body

    if (!tier_id) {
      return NextResponse.json({ error: 'tier_id wajib diisi' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const productId = params.productId

    const { data: tier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', tier_id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single()

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Paket keanggotaan tidak ditemukan' }, { status: 404 })
    }

    const months = period_months === 12 ? 12 : Number(period_months) || 1

    let paidOrderId: string | null = null

    if (payment_confirmed && order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, user_id, status')
        .eq('id', order_id)
        .single()

      if (orderError || !order) {
        return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
      }
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: 'Pesanan tidak milik Anda' }, { status: 403 })
      }
      if (String(order.status).toLowerCase() !== 'paid') {
        return NextResponse.json({ error: 'Pesanan belum dibayar' }, { status: 400 })
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('id, product_id')
        .eq('order_id', order_id)
        .eq('product_id', productId)

      if (!items?.length) {
        return NextResponse.json(
          { error: 'Pesanan tidak berisi produk keanggotaan ini' },
          { status: 400 }
        )
      }
      paidOrderId = order.id
    } else {
      // Look for a recent paid order for this product+user
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('order_id, orders!inner(id, user_id, status, created_at)')
        .eq('product_id', productId)
        .eq('orders.user_id', user.id)
        .eq('orders.status', 'paid')
        .order('created_at', { ascending: false, foreignTable: 'orders' })
        .limit(1)

      const first = orderItems?.[0]
      if (first?.order_id) {
        paidOrderId = first.order_id as string
      }
    }

    if (paidOrderId) {
      try {
        const subscription = await activateSubscription(supabase, {
          userId: user.id,
          productId,
          tierId: tier_id,
          months,
          orderId: paidOrderId,
        })
        return NextResponse.json({
          success: true,
          message: 'Langganan berhasil diaktifkan',
          subscription,
        })
      } catch (e) {
        console.error('[MEMBERSHIP SUBSCRIBE] activate', e)
        return NextResponse.json({ error: 'Gagal mengaktifkan langganan' }, { status: 500 })
      }
    }

    const amount =
      months === 12 && tier.price_yearly != null
        ? Number(tier.price_yearly)
        : Number(tier.price_monthly) * months

    return NextResponse.json({
      needs_payment: true,
      message: 'Pembayaran diperlukan untuk mengaktifkan keanggotaan',
      checkout_intent: {
        product_id: productId,
        tier_id,
        period_months: months,
        amount,
        currency: 'IDR',
      },
    })
  } catch (error) {
    console.error('[MEMBERSHIP SUBSCRIBE] Error:', error)
    return NextResponse.json({ error: 'Gagal memproses langganan' }, { status: 500 })
  }
}
