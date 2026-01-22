import { NextRequest, NextResponse } from 'next/server'
import { createDanaOrder } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to verify DANA error handling
 * This endpoint helps verify error scenarios:
 * - 4005401: Invalid Field Format
 * - 4045418: Inconsistent Request
 */
export async function POST(req: NextRequest) {
  try {
    const { testCase } = await req.json()

    if (!testCase || (testCase !== '4005401' && testCase !== '4045418')) {
      return NextResponse.json({
        error: 'Invalid test case',
        validCases: ['4005401', '4045418']
      }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const testOrderNumber = `TEST-${Date.now()}`

    if (testCase === '4005401') {
      // Test 4005401: Invalid Field Format
      // This error occurs when a field has wrong format (e.g., invalid enum, wrong data type)
      console.log('[DANA TEST] Testing 4005401 - Invalid Field Format')

      try {
        // Intentionally send invalid field format:
        // - Invalid currency format
        // - Invalid amount format (not decimal)
        // - Invalid enum value for scenario
        const invalidOrder = await createDanaOrder({
          partnerReferenceNo: testOrderNumber,
          merchantId: process.env.DANA_MERCHANT_ID || '',
          amount: {
            value: '10000', // Invalid: should be "10000.00" with decimals
            currency: 'USD', // Invalid: should be "IDR"
          },
          webRedirectUrl: `${baseUrl}/payment/dana/finish`,
          finishNotifyUrl: `${baseUrl}/api/payments/dana/callback`,
          scenario: 'INVALID_SCENARIO' as 'REDIRECT' | 'API', // Invalid enum value (type cast for testing)
        })

        // If we get here, the error wasn't caught - log it
        console.warn('[DANA TEST] 4005401 test did not trigger error as expected')
        return NextResponse.json({
          success: false,
          testCase: '4005401',
          message: 'Error was not triggered - DANA may have accepted invalid format',
          response: invalidOrder
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log('[DANA TEST] 4005401 error caught:', errorMessage)

        // Check if error contains 4005401
        if (errorMessage.includes('4005401') || errorMessage.includes('Invalid Field Format')) {
          return NextResponse.json({
            success: true,
            testCase: '4005401',
            message: 'Invalid Field Format error correctly handled',
            error: errorMessage
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase: '4005401',
            message: 'Error occurred but may not be 4005401',
            error: errorMessage
          })
        }
      }
    } else if (testCase === '4045418') {
      // Test 4045418: Inconsistent Request
      // This error occurs when there's inconsistency (e.g., amount mismatch, missing required fields)
      console.log('[DANA TEST] Testing 4045418 - Inconsistent Request')

      try {
        // Intentionally create inconsistent request:
        // - Missing required fields that depend on other fields
        // - Amount mismatch between order items and total
        // - Missing urlParams when scenario requires it
        const inconsistentOrder = await createDanaOrder({
          partnerReferenceNo: testOrderNumber,
          merchantId: process.env.DANA_MERCHANT_ID || '',
          amount: {
            value: '10000.00',
            currency: 'IDR',
          },
          // Intentionally missing urlParams to create inconsistency
          // (urlParams is required for REDIRECT scenario)
          webRedirectUrl: undefined,
          finishNotifyUrl: undefined,
        })

        // If we get here, the error wasn't caught - log it
        console.warn('[DANA TEST] 4045418 test did not trigger error as expected')
        return NextResponse.json({
          success: false,
          testCase: '4045418',
          message: 'Error was not triggered - DANA may have accepted inconsistent request',
          response: inconsistentOrder
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log('[DANA TEST] 4045418 error caught:', errorMessage)

        // Check if error contains 4045418
        if (errorMessage.includes('4045418') || errorMessage.includes('Inconsistent Request')) {
          return NextResponse.json({
            success: true,
            testCase: '4045418',
            message: 'Inconsistent Request error correctly handled',
            error: errorMessage
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase: '4045418',
            message: 'Error occurred but may not be 4045418',
            error: errorMessage
          })
        }
      }
    }

    return NextResponse.json({ error: 'Unknown test case' }, { status: 400 })
  } catch (error: unknown) {
    console.error('[DANA TEST] Test endpoint error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Test failed',
      details: errorMessage
    }, { status: 500 })
  }
}
