import { NextRequest, NextResponse } from 'next/server'
import { queryPaymentStatus } from '@/lib/dana'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Query DANA payment status by order number
 * GET /api/payments/dana/status?order_number=ORD-2026-xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const orderNumber = searchParams.get('order_number')

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'order_number is required' },
        { status: 400 }
      )
    }

    // Query DANA API for payment status
    const danaStatus = await queryPaymentStatus(orderNumber)

    console.log('[DANA STATUS API] Payment status:', JSON.stringify(danaStatus, null, 2))

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find order first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      console.error('[DANA STATUS API] Order not found:', orderNumber, orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    console.log('[DANA STATUS API] Current order status:', order.status)

    // Check if payment is successful - handle multiple response formats
    const isPaid = 
      danaStatus.responseCode === '2005400' && (
        danaStatus.transactionStatus === 'SUCCESS' ||
        danaStatus.transactionStatus === 'PAID' ||
        danaStatus.transactionStatus === 'SUCCESSFUL' ||
        // Sometimes DANA returns success without transactionStatus
        (danaStatus.responseCode === '2005400' && !danaStatus.transactionStatus)
      )

    // If payment is successful and order is not already paid, update it
    if (isPaid && order.status !== 'paid') {
      console.log('[DANA STATUS API] Updating order to paid status...')
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          transaction_id: danaStatus.referenceNo || order.transaction_id,
          payment_id: danaStatus.referenceNo || order.payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('[DANA STATUS API] Error updating order:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to update order',
            details: updateError.message 
          },
          { status: 500 }
        )
      }

      console.log('[DANA STATUS API] Successfully updated order to paid:', order.id)
    } else if (isPaid && order.status === 'paid') {
      console.log('[DANA STATUS API] Order already paid, no update needed')
    } else {
      console.log('[DANA STATUS API] Payment not confirmed yet. ResponseCode:', danaStatus.responseCode, 'TransactionStatus:', danaStatus.transactionStatus)
    }

    return NextResponse.json({
      status: danaStatus.transactionStatus?.toLowerCase() || 'unknown',
      responseCode: danaStatus.responseCode,
      responseMessage: danaStatus.responseMessage,
      referenceNo: danaStatus.referenceNo,
    })
  } catch (error) {
    console.error('[DANA STATUS API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query payment status' },
      { status: 500 }
    )
  }
}
