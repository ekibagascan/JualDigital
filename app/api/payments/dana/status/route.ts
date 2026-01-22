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
    // Note: Only query DANA if order exists and was created through DANA
    let danaStatus
    try {
      danaStatus = await queryPaymentStatus(orderNumber)
      console.log('[DANA STATUS API] Payment status:', JSON.stringify(danaStatus, null, 2))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to query DANA API'
      console.error('[DANA STATUS API] Error querying DANA:', error)
      console.error('[DANA STATUS API] Error details:', errorMessage)

      // Check if it's a specific DANA error code
      let danaErrorCode: string | undefined
      let danaErrorMessage: string | undefined

      // Try to extract DANA error code from error message
      if (errorMessage.includes('4045501') || errorMessage.includes('Transaction not found') || errorMessage.includes('not found')) {
        danaErrorCode = '4045501'
        danaErrorMessage = 'Transaction Not Found'
      } else if (errorMessage.includes('4005502')) {
        danaErrorCode = '4005502'
        danaErrorMessage = 'Invalid Mandatory Field'
      } else if (errorMessage.includes('5005501')) {
        danaErrorCode = '5005501'
        danaErrorMessage = 'Internal Server Error'
      } else if (errorMessage.includes('4015500') || errorMessage.includes('Unauthorized')) {
        danaErrorCode = '4015500'
        danaErrorMessage = 'Unauthorized / Invalid Signature'
      }

      // If DANA API fails, still return current order status
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: order } = await supabase
        .from('orders')
        .select('status, payment_method')
        .eq('order_number', orderNumber)
        .single()

      return NextResponse.json({
        status: order?.status || 'unknown',
        responseCode: danaErrorCode || 'ERROR',
        responseMessage: danaErrorMessage || errorMessage,
        error: true,
        orderExists: !!order,
        paymentMethod: order?.payment_method,
        note: order
          ? 'Order exists in database but DANA API returned an error. This could mean: 1) Order not found in DANA system, 2) Order was created with different payment method, 3) DANA API issue.'
          : 'Order not found in database. Make sure the order number is correct and was created through DANA payment.'
      })
    }

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

    // Check if order was created through DANA payment
    if (order.payment_method && order.payment_method !== 'dana') {
      console.warn('[DANA STATUS API] Order was not created through DANA payment:', {
        orderNumber,
        paymentMethod: order.payment_method
      })
      return NextResponse.json({
        error: 'Order was not created through DANA payment',
        orderNumber,
        paymentMethod: order.payment_method,
        note: 'This order was created with a different payment method. DANA status query only works for orders created through DANA payment. Please use an order number from a DANA transaction.'
      }, { status: 400 })
    }

    console.log('[DANA STATUS API] Current order status:', order.status)

    // Check if payment is successful - handle multiple response formats
    // DANA status API might use different field names: transactionStatus or latestTransactionStatus
    // Status codes: "00" = Success, "SUCCESS" = Success, "PAID" = Paid
    // Response codes: 2005500 = Status query success, 2005400 = Order creation success
    const transactionStatus = danaStatus.transactionStatus || danaStatus.latestTransactionStatus
    const isSuccessResponse = danaStatus.responseCode === '2005500' || danaStatus.responseCode === '2005400' || danaStatus.responseCode === '200'
    const isPaid =
      isSuccessResponse && (
        transactionStatus === 'SUCCESS' ||
        transactionStatus === 'PAID' ||
        transactionStatus === 'SUCCESSFUL' ||
        transactionStatus === '00' || // DANA uses "00" for success
        // Sometimes DANA returns success without transactionStatus but with referenceNo
        ((danaStatus.responseCode === '2005500' || danaStatus.responseCode === '2005400') && danaStatus.referenceNo && !transactionStatus)
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

      // Return success immediately so frontend can refresh
      return NextResponse.json({
        status: 'paid',
        responseCode: danaStatus.responseCode,
        responseMessage: danaStatus.responseMessage,
        referenceNo: danaStatus.referenceNo,
        updated: true,
      })
    } else if (isPaid && order.status === 'paid') {
      console.log('[DANA STATUS API] Order already paid, no update needed')
    } else {
      console.log('[DANA STATUS API] Payment not confirmed yet. ResponseCode:', danaStatus.responseCode, 'TransactionStatus:', transactionStatus)
      console.log('[DANA STATUS API] Full DANA response:', JSON.stringify(danaStatus, null, 2))

      // If DANA returns an error but order might actually be paid, check transaction_id
      // Sometimes DANA status API fails but payment was successful
      if (danaStatus.responseCode !== '2005400' && order.transaction_id && order.transaction_id !== order.order_number) {
        console.log('[DANA STATUS API] DANA API returned error, but order has transaction_id:', order.transaction_id)
        console.log('[DANA STATUS API] This suggests payment might have been successful. Checking if we should update...')
        // If transaction_id is different from order_number, it means DANA assigned a referenceNo
        // This is a strong indicator that payment was processed
        // However, we can't be 100% sure without DANA confirmation, so we'll wait for webhook
      }
    }

    return NextResponse.json({
      status: transactionStatus?.toLowerCase() || 'unknown',
      responseCode: danaStatus.responseCode,
      responseMessage: danaStatus.responseMessage,
      referenceNo: danaStatus.referenceNo,
      transactionStatus: transactionStatus,
    })
  } catch (error) {
    console.error('[DANA STATUS API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query payment status' },
      { status: 500 }
    )
  }
}
