import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { OrderService } from '@/lib/order-service'
import { fulfillPaidOrder } from '@/lib/fulfillment-service'
import { normalizeUUID, parseAppleTransactionJWS } from '@/lib/apple-iap'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const orderId = String(body.order_id || body.orderId || '')
    const signedTransaction = String(body.signed_transaction || body.signedTransaction || '')
    if (!orderId || !signedTransaction) {
      return NextResponse.json(
        { error: 'order_id dan signed_transaction wajib' },
        { status: 400 }
      )
    }

    const payload = parseAppleTransactionJWS(signedTransaction)
    const supabase = serviceRoleClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, transaction_id, payment_provider')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Pesanan tidak milik Anda' }, { status: 403 })
    }

    const tokenOrderId = normalizeUUID(payload.appAccountToken)
    if (tokenOrderId && tokenOrderId !== normalizeUUID(order.id)) {
      return NextResponse.json(
        { error: 'Transaksi App Store tidak cocok dengan pesanan ini' },
        { status: 400 }
      )
    }

    if (String(order.status).toLowerCase() === 'paid') {
      if (order.transaction_id && order.transaction_id !== payload.transactionId) {
        return NextResponse.json(
          { error: 'Pesanan sudah dibayar dengan transaksi lain' },
          { status: 409 }
        )
      }
      return NextResponse.json({
        order_id: order.id,
        status: 'paid',
        transaction_id: payload.transactionId,
      })
    }

    const { data: other } = await supabase
      .from('orders')
      .select('id')
      .eq('transaction_id', payload.transactionId)
      .neq('id', order.id)
      .maybeSingle()

    if (other) {
      return NextResponse.json(
        { error: 'Transaksi App Store sudah digunakan' },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_provider: 'apple',
        payment_method: 'APPLE_IAP',
        transaction_id: payload.transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('[APPLE IAP FULFILL] update', updateError)
      return NextResponse.json({ error: 'Gagal mengonfirmasi pembayaran' }, { status: 500 })
    }

    const orderService = new OrderService(supabase)
    await orderService.updateOrderStatus(order.id, 'paid', payload.transactionId)

    try {
      await fulfillPaidOrder(supabase, order.id)
    } catch (fulfillErr) {
      console.error('[APPLE IAP FULFILL] fulfillment', fulfillErr)
    }

    return NextResponse.json({
      order_id: order.id,
      status: 'paid',
      transaction_id: payload.transactionId,
      environment: payload.environment || null,
    })
  } catch (error: unknown) {
    console.error('[APPLE IAP FULFILL]', error)
    const message = error instanceof Error ? error.message : 'Gagal memproses In-App Purchase'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
