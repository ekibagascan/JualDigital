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
    
    console.log('[DANA STATUS API] Payment status:', danaStatus)

    // If payment is successful, update order in database
    if (danaStatus.responseCode === '2005400' && 
        (danaStatus.transactionStatus === 'SUCCESS' || danaStatus.transactionStatus === 'PAID')) {
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Find and update order
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (order && order.status !== 'paid') {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            transaction_id: danaStatus.referenceNo || order.transaction_id,
            payment_id: danaStatus.referenceNo || order.payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        console.log('[DANA STATUS API] Updated order to paid:', order.id)
      }
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
