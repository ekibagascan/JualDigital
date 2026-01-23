import { NextRequest, NextResponse } from 'next/server'
import { createDanaOrder } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to create a DANA order with short expiration (1-2 minutes)
 * for testing cancelled (05) status
 */
export async function POST(req: NextRequest) {
  try {
    const { expirationMinutes = 2 } = await req.json().catch(() => ({ expirationMinutes: 2 }))

    const merchantId = process.env.DANA_MERCHANT_ID
    if (!merchantId) {
      return NextResponse.json({
        error: 'DANA_MERCHANT_ID not configured'
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    
    // Generate order number
    const orderNumber = `TEST-CANCEL-${Date.now()}`
    
    // Calculate expiration time (default 2 minutes, minimum 1 minute)
    const expMinutes = Math.max(1, Math.min(expirationMinutes, 5)) // Between 1-5 minutes
    const now = new Date()
    const expirationTime = new Date(now.getTime() + (expMinutes * 60 * 1000))
    const jakartaTime = new Date(expirationTime.getTime() + (7 * 60 * 60 * 1000))
    const year = jakartaTime.getUTCFullYear()
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
    const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
    const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')
    const validUpTo = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`

    console.log('[DANA TEST CANCELLED] Creating order with short expiration:', {
      orderNumber,
      expirationMinutes: expMinutes,
      validUpTo,
      expiresAt: expirationTime.toISOString()
    })

    // Create DANA order with short expiration
    const danaOrder = await createDanaOrder({
      partnerReferenceNo: orderNumber,
      merchantId: merchantId,
      amount: {
        value: '10000.00',
        currency: 'IDR',
      },
      validUpTo: validUpTo,
      scenario: 'REDIRECT',
      webRedirectUrl: `${baseUrl}/payment/dana/finish`,
      finishNotifyUrl: `${baseUrl}/api/payments/dana/callback`,
      customer: {
        firstName: 'Test',
        lastName: 'Cancelled',
      },
      orderItems: [{
        name: 'Test Order for Cancelled Status',
        price: {
          value: '10000.00',
          currency: 'IDR',
        },
        quantity: 1,
      }],
    })

    const expiresInSeconds = expMinutes * 60
    const waitTime = expiresInSeconds + 10 // Wait 10 seconds after expiration

    return NextResponse.json({
      success: true,
      message: `Order created with ${expMinutes} minute expiration. Wait ${waitTime} seconds then query status.`,
      orderNumber,
      partnerReferenceNo: danaOrder.partnerReferenceNo || orderNumber,
      validUpTo,
      expiresIn: `${expMinutes} minutes`,
      expiresAt: expirationTime.toISOString(),
      waitTimeSeconds: waitTime,
      instructions: [
        `1. Order created: ${orderNumber}`,
        `2. Wait ${waitTime} seconds (${expMinutes} minutes + 10 seconds buffer)`,
        `3. Query status: curl -X POST https://jualdigital.id/api/payments/dana/test-status -H "Content-Type: application/json" -d '{"testCase": "2005500-cancelled", "partnerReferenceNo": "${orderNumber}"}'`,
        `4. Expected: responseCode "2005500" with latestTransactionStatus "05"`
      ],
      danaResponse: {
        responseCode: danaOrder.responseCode,
        responseMessage: danaOrder.responseMessage,
        webRedirectUrl: danaOrder.webRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[DANA TEST CANCELLED] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Failed to create test order',
      details: errorMessage
    }, { status: 500 })
  }
}
