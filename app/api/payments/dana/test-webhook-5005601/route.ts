import { NextRequest, NextResponse } from 'next/server'
import { createDanaOrder } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to create a DANA order that will trigger webhook 5005601 response
 * This creates an order with special pattern TEST-5005601-* that webhook will detect
 * and return 5005601 (Internal Server Error) instead of 2005600
 * 
 * Usage:
 * POST /api/payments/dana/test-webhook-5005601
 * Body: {} (optional: can specify amount, etc)
 */
export async function POST(req: NextRequest) {
  try {
    const { amount = '10000.00' } = await req.json().catch(() => ({ amount: '10000.00' }))

    const merchantId = process.env.DANA_MERCHANT_ID
    if (!merchantId) {
      return NextResponse.json({
        error: 'DANA_MERCHANT_ID not configured'
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'

    // Generate order number with special pattern that webhook will detect
    // Webhook will return 5005601 for orders starting with TEST-5005601- or DANA-TEST-5005601-
    const orderNumber = `TEST-5005601-${Date.now()}`

    console.log('[DANA WEBHOOK 5005601 TEST] Creating order with special pattern:', {
      orderNumber,
      pattern: 'TEST-5005601-*',
      note: 'Webhook will return 5005601 when DANA triggers webhook for this order'
    })

    // Create DANA order with special pattern
    const danaOrder = await createDanaOrder({
      partnerReferenceNo: orderNumber,
      merchantId: merchantId,
      amount: {
        value: amount,
        currency: 'IDR',
      },
      scenario: 'REDIRECT',
      webRedirectUrl: `${baseUrl}/payment/dana/finish`,
      finishNotifyUrl: `${baseUrl}/api/payments/dana/callback`,
      customer: {
        firstName: 'Test',
        lastName: 'Webhook 5005601',
      },
      orderItems: [{
        name: 'Test Order for Webhook 5005601',
        price: {
          value: amount,
          currency: 'IDR',
        },
        quantity: 1,
      }],
    })

    return NextResponse.json({
      success: true,
      message: 'Order created with pattern TEST-5005601-*. When DANA triggers webhook, it will return 5005601.',
      orderNumber,
      partnerReferenceNo: danaOrder.partnerReferenceNo || orderNumber,
      paymentUrl: danaOrder.webRedirectUrl,
      instructions: [
        `1. Order created: ${orderNumber}`,
        `2. Complete payment using the payment URL above`,
        `3. After payment success, DANA will trigger webhook`,
        `4. Webhook will detect pattern "TEST-5005601-" and return 5005601`,
        `5. Expected webhook response: {"responseCode": "5005601", "responseMessage": "Internal Server Error"}`,
        `6. DANA can verify this in dashboard`
      ],
      webhookBehavior: {
        pattern: 'TEST-5005601-*',
        willReturn: '5005601',
        responseMessage: 'Internal Server Error',
        note: 'This simulates internal server error from our side, not DANA error'
      },
      danaResponse: {
        responseCode: danaOrder.responseCode,
        responseMessage: danaOrder.responseMessage,
        webRedirectUrl: danaOrder.webRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[DANA WEBHOOK 5005601 TEST] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Failed to create test order',
      details: errorMessage
    }, { status: 500 })
  }
}
