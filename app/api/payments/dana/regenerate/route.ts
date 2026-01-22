import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDanaOrder } from '@/lib/dana'
import { OrderService } from '@/lib/order-service'

export const dynamic = 'force-dynamic'

/**
 * Regenerate DANA payment URL for an existing order
 * POST /api/payments/dana/regenerate
 * Body: { order_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const orderId = body.order_id

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_title,
          price,
          quantity,
          product_id,
          seller_id
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[DANA REGENERATE] Order not found:', orderId, orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Only allow regeneration for pending/cancelled DANA orders
    if (order.status === 'paid') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      )
    }

    if (order.payment_provider !== 'dana') {
      return NextResponse.json(
        { error: 'Order is not a DANA payment' },
        { status: 400 }
      )
    }

    // Prepare order data for DANA
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const customerName = order.guest_name || 'Customer'
    const nameParts = customerName.split(' ')
    const firstName = nameParts[0] || customerName
    const lastName = nameParts.slice(1).join(' ') || undefined

    // Create new DANA order with same order_number (DANA allows this for expired orders)
    const danaOrder = await createDanaOrder({
      partnerReferenceNo: order.order_number,
      merchantId: process.env.DANA_MERCHANT_ID || '',
      amount: {
        value: Math.round(order.total_amount).toString(),
        currency: 'IDR',
      },
      scenario: 'REDIRECT',
      webRedirectUrl: `${baseUrl}/payment/dana/finish?order_id=${order.id}`,
      finishNotifyUrl: `${baseUrl}/api/payments/dana/callback`,
      customer: {
        firstName: firstName,
        lastName: lastName,
        email: order.guest_email,
        phone: order.guest_phone,
      },
      orderItems: (order.order_items || []).map(item => ({
        name: item.product_title.length > 100 ? item.product_title.substring(0, 97) + '...' : item.product_title,
        price: {
          value: Math.round(item.price).toString(),
          currency: 'IDR',
        },
        quantity: item.quantity,
      })),
    })

    // Update order with new payment URL
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending', // Reset to pending
        payment_provider: 'dana',
        transaction_id: danaOrder.referenceNo || order.transaction_id,
        invoice_url: danaOrder.webRedirectUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('[DANA REGENERATE] Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    console.log('[DANA REGENERATE] Regenerated payment URL for order:', order.id)

    return NextResponse.json({
      success: true,
      payment_url: danaOrder.webRedirectUrl,
      order_id: order.id,
    })
  } catch (error) {
    console.error('[DANA REGENERATE] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate payment URL' },
      { status: 500 }
    )
  }
}
