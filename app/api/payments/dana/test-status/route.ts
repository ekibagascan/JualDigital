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

    // For error test cases, partnerReferenceNo is optional (we can generate non-existent ones)
    // For success test cases, partnerReferenceNo is required
    const errorTestCases = ['4045501-notfound', '4005502-invalid', '4015500-unauthorized', '5005501-error']
    const isErrorTestCase = errorTestCases.includes(testCase)
    
    if (!isErrorTestCase && (!partnerReferenceNo || partnerReferenceNo === 'YOUR_ACTUAL_ORDER_NUMBER')) {
      return NextResponse.json({
        error: 'partnerReferenceNo is required for this test case',
        note: 'Use an actual order number that has been processed through DANA. Replace "YOUR_ACTUAL_ORDER_NUMBER" with a real order number.',
        example: 'Use an order number from your database that was created through DANA payment',
        noteForErrorTests: 'For error test cases (4045501, 4005502, 4015500), partnerReferenceNo is optional - we can generate test values'
      }, { status: 400 })
    }
    
    // For error test cases, use provided partnerReferenceNo or generate a test one
    const finalPartnerReferenceNo = partnerReferenceNo || 
      (testCase === '4045501-notfound' ? `NON-EXISTENT-${Date.now()}` : 
       testCase === '4005502-invalid' ? 'INVALID-FORMAT' :
       testCase === '4015500-unauthorized' ? 'TEST-ORDER-001' :
       'TEST-ORDER-001')

    console.log('[DANA STATUS TEST] Testing:', testCase, 'for order:', partnerReferenceNo)

    try {
      // Query DANA API for payment status
      const danaStatus = await queryPaymentStatus(partnerReferenceNo)

      console.log('[DANA STATUS TEST] DANA API response:', JSON.stringify(danaStatus, null, 2))

      // Verify the response based on test case
      let expectedResponseCode: string
      let expectedTransactionStatus: string | undefined
      let expectedMessage: string

      // Handle different test cases
      if (testCase === '2005500-success') {
        expectedResponseCode = '2005500'
        expectedTransactionStatus = '00'
        expectedMessage = 'Successful'
      } else if (testCase === '2005500-pending') {
        expectedResponseCode = '2005500'
        expectedTransactionStatus = '01'
        expectedMessage = 'Successful'
      } else if (testCase === '2005500-cancelled') {
        expectedResponseCode = '2005500'
        expectedTransactionStatus = '05'
        expectedMessage = 'Successful'
      } else if (testCase === '4045501-notfound') {
        expectedResponseCode = '4045501'
        expectedMessage = 'Transaction Not Found'
      } else if (testCase === '4005502-invalid') {
        expectedResponseCode = '4005502'
        expectedMessage = 'Invalid Mandatory Field'
      } else if (testCase === '5005501-error') {
        expectedResponseCode = '5005501'
        expectedMessage = 'Internal Server Error'
      } else if (testCase === '4015500-unauthorized') {
        expectedResponseCode = '4015500'
        expectedMessage = 'Unauthorized / Invalid Signature'
      } else {
        return NextResponse.json({
          success: false,
          testCase,
          message: `Unknown test case: ${testCase}`,
          verified: false
        })
      }

      // Verify response for success scenarios (2005500 with different statuses)
      if (testCase.startsWith('2005500-')) {
        if (danaStatus.responseCode === expectedResponseCode &&
          danaStatus.latestTransactionStatus === expectedTransactionStatus) {
          return NextResponse.json({
            success: true,
            testCase,
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
            testCase,
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
        // For error scenarios, verify the error code
        if (danaStatus.responseCode === expectedResponseCode) {
          return NextResponse.json({
            success: true,
            testCase,
            message: `Status query correctly returned error code ${expectedResponseCode}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedMessage
            },
            actual: {
              responseCode: danaStatus.responseCode,
              responseMessage: danaStatus.responseMessage
            },
            verified: true
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase,
            message: `Expected error code ${expectedResponseCode}, but got ${danaStatus.responseCode}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedMessage
            },
            actual: {
              responseCode: danaStatus.responseCode,
              responseMessage: danaStatus.responseMessage
            },
            fullResponse: danaStatus,
            verified: false
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DANA STATUS TEST] Error:', errorMessage)

      // Check if this is the expected error for the test case
      const errorCodeMatch = errorMessage.match(/DANA Error (\d+):/i) || errorMessage.match(/(\d{7})/)
      const extractedErrorCode = errorCodeMatch ? errorCodeMatch[1] : null
      
      if (testCase === '4045501-notfound' && (extractedErrorCode === '4045501' || errorMessage.includes('not found'))) {
        return NextResponse.json({
          success: true,
          testCase: '4045501-notfound',
          message: 'Transaction not found error correctly triggered',
          verified: true
        })
      } else if (testCase === '4005502-invalid' && extractedErrorCode === '4005502') {
        return NextResponse.json({
          success: true,
          testCase: '4005502-invalid',
          message: 'Invalid mandatory field error correctly triggered',
          verified: true
        })
      } else if (testCase === '5005501-error' && extractedErrorCode === '5005501') {
        return NextResponse.json({
          success: true,
          testCase: '5005501-error',
          message: 'Internal server error correctly triggered',
          verified: true
        })
      } else if (testCase === '4015500-unauthorized' && extractedErrorCode === '4015500') {
        return NextResponse.json({
          success: true,
          testCase: '4015500-unauthorized',
          message: 'Unauthorized/invalid signature error correctly triggered',
          verified: true
        })
      }

      // Provide more helpful error message
      let helpfulMessage = errorMessage
      if (errorMessage.includes('DANA API credentials not configured')) {
        helpfulMessage = 'DANA API credentials are not configured. Please set DANA_CLIENT_ID, DANA_MERCHANT_ID, and DANA_PRIVATE_KEY environment variables.'
      } else if (errorMessage.includes('Order not found') || errorMessage.includes('404')) {
        helpfulMessage = `Order "${partnerReferenceNo}" not found in DANA system. Make sure the order number exists and was created through DANA payment.`
      } else if (errorMessage.includes('Internal Server Error')) {
        helpfulMessage = `DANA API returned an error. This could mean: 1) Order doesn't exist in DANA system, 2) Invalid order number format, 3) DANA API issue. Check server logs for details.`
      }

      return NextResponse.json({
        success: false,
        testCase,
        error: 'Query failed',
        details: helpfulMessage,
        originalError: errorMessage,
        note: 'Make sure you are using an actual order number that exists in DANA system and was created through DANA payment flow.',
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
