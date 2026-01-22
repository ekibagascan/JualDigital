import { NextRequest, NextResponse } from 'next/server'
import { queryPaymentStatus } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to verify DANA payment status query responses
 * This endpoint tests the status query API and verifies response codes
 * 
 * Usage:
 * POST /api/payments/dana/test-status
 * Body: {
 *   "testCase": "2005500-success" | "2005500-pending" | "2005500-cancelled" | "4045501-notfound" | "4005502-invalid" | "5005501-error" | "4015500-unauthorized",
 *   "partnerReferenceNo": "ORDER_NUMBER"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { testCase, partnerReferenceNo } = await req.json()

    if (!testCase) {
      return NextResponse.json({
        error: 'Invalid test case',
        validCases: [
          '2005500-success',      // Successful - Final (00 = Success)
          '2005500-pending',      // Successful - Pending (01 = Pending)
          '2005500-cancelled',    // Successful - Cancelled (05 = Cancelled)
          '4045501-notfound',     // Transaction Not Found
          '4005502-invalid',      // Invalid Mandatory Field
          '5005501-error',        // Internal Server Error
          '4015500-unauthorized'  // Unauthorized / Invalid Signature
        ],
        description: {
          '2005500-success': 'Test successful transaction status (latestTransactionStatus = 00) returns 2005500',
          '2005500-pending': 'Test pending transaction status (latestTransactionStatus = 01) returns 2005500',
          '2005500-cancelled': 'Test cancelled transaction status (latestTransactionStatus = 05) returns 2005500',
          '4045501-notfound': 'Test transaction not found error (4045501)',
          '4005502-invalid': 'Test invalid mandatory field error (4005502)',
          '5005501-error': 'Test internal server error (5005501)',
          '4015500-unauthorized': 'Test unauthorized/invalid signature error (4015500)'
        }
      }, { status: 400 })
    }

    if (!partnerReferenceNo) {
      return NextResponse.json({
        error: 'partnerReferenceNo is required',
        note: 'Use an existing order number that has been processed through DANA'
      }, { status: 400 })
    }

    console.log('[DANA STATUS TEST] Testing:', testCase, 'for order:', partnerReferenceNo)

    try {
      // Query DANA API for payment status
      const danaStatus = await queryPaymentStatus(partnerReferenceNo)
      
      console.log('[DANA STATUS TEST] DANA API response:', JSON.stringify(danaStatus, null, 2))

      // Verify the response based on test case
      let expectedResponseCode: string
      let expectedTransactionStatus: string | undefined
      let expectedMessage: string

      if (testCase === '2005500-success') {
        expectedResponseCode = '2005500'
        expectedTransactionStatus = '00'
        expectedMessage = 'Successful'
        
        // Verify response
        if (danaStatus.responseCode === expectedResponseCode && 
            danaStatus.latestTransactionStatus === expectedTransactionStatus) {
          return NextResponse.json({
            success: true,
            testCase: '2005500-success',
            message: `Status query correctly returned ${expectedResponseCode} with latestTransactionStatus ${expectedTransactionStatus}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedMessage,
              latestTransactionStatus: expectedTransactionStatus
            },
            actual: {
              responseCode: danaStatus.responseCode,
              responseMessage: danaStatus.responseMessage,
              latestTransactionStatus: danaStatus.latestTransactionStatus,
              transactionStatus: danaStatus.transactionStatus
            },
            verified: true
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase: '2005500-success',
            message: `Expected ${expectedResponseCode} with latestTransactionStatus ${expectedTransactionStatus}, but got ${danaStatus.responseCode} with ${danaStatus.latestTransactionStatus || danaStatus.transactionStatus}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedMessage,
              latestTransactionStatus: expectedTransactionStatus
            },
            actual: {
              responseCode: danaStatus.responseCode,
              responseMessage: danaStatus.responseMessage,
              latestTransactionStatus: danaStatus.latestTransactionStatus,
              transactionStatus: danaStatus.transactionStatus
            },
            fullResponse: danaStatus,
            verified: false
          })
        }
      } else {
        // For other test cases, we need DANA to return specific error codes
        // These can't be easily tested without DANA's cooperation
        return NextResponse.json({
          success: false,
          testCase,
          message: `Test case ${testCase} requires DANA to return specific error codes. This can only be verified when DANA actually returns these codes.`,
          note: 'To test error scenarios, you need to trigger them through DANA API (e.g., query non-existent order for 4045501)',
          currentResponse: danaStatus,
          verified: false
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DANA STATUS TEST] Error:', errorMessage)
      
      // Check if this is the expected error for the test case
      if (testCase === '4045501-notfound' && errorMessage.includes('not found')) {
        return NextResponse.json({
          success: true,
          testCase: '4045501-notfound',
          message: 'Transaction not found error correctly triggered',
          verified: true
        })
      }
      
      return NextResponse.json({
        success: false,
        testCase,
        error: 'Query failed',
        details: errorMessage,
        verified: false
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[DANA STATUS TEST] Test endpoint error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Test failed',
      details: errorMessage
    }, { status: 500 })
  }
}
