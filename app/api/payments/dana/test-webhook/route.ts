import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Format RSA key to PEM format if needed
 */
function formatPemKey(rawKey: string, type: 'PRIVATE' | 'PUBLIC'): string {
  if (!rawKey) {
    throw new Error(`DANA ${type} key is empty`)
  }

  let key = rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  key = key.replace(/-----BEGIN.*?-----\n?/g, '')
  key = key.replace(/\n?-----END.*?-----/g, '')
  key = key.replace(/\s+/g, '')

  const header = `-----BEGIN ${type} KEY-----\n`
  const footer = `\n-----END ${type} KEY-----`
  const formattedKey = key.match(/.{1,64}/g)?.join('\n') || key

  const result = header + formattedKey + footer

  if (key.length < 100) {
    throw new Error(`DANA ${type} key appears to be invalid or truncated (length: ${key.length})`)
  }

  return result
}

/**
 * Generate signature for webhook payload (if needed for testing)
 */
function generateWebhookSignature(payload: string, privateKey: string): string {
  try {
    const formattedKey = formatPemKey(privateKey, 'PRIVATE')
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(payload)
    sign.end()
    const signature = sign.sign(formattedKey, 'base64')
    return signature
  } catch (error) {
    console.error('[DANA WEBHOOK TEST] Error generating signature:', error)
    return 'test-signature'
  }
}

/**
 * Test endpoint to verify DANA webhook response codes
 * This endpoint simulates DANA webhook notifications and tests the callback response
 * 
 * Usage:
 * POST /api/payments/dana/test-webhook
 * Body: {
 *   "testCase": "2005600-success" | "5005601-error" | "2005600-expired",
 *   "partnerReferenceNo": "ORDER_NUMBER"
 * }
 * 
 * Test Cases:
 * - 2005600-success: Tests successful transaction (latestTransactionStatus = 00) returns 2005600
 * - 5005601-error: Tests internal server error (5005601) response for successful transaction
 * - 2005600-expired: Tests closed/expired transaction (latestTransactionStatus = 05) returns 2005600
 */
export async function POST(req: NextRequest) {
  try {
    const { testCase, partnerReferenceNo } = await req.json()

    if (!testCase || !['2005600-success', '5005601-error', '2005600-expired'].includes(testCase)) {
      return NextResponse.json({
        error: 'Invalid test case',
        validCases: ['2005600-success', '5005601-error', '2005600-expired'],
        description: {
          '2005600-success': 'Test successful transaction (latestTransactionStatus = 00) returns 2005600 with "Successful"',
          '5005601-error': 'Test internal server error (5005601) response with "Internal Server Error"',
          '2005600-expired': 'Test closed/expired transaction (latestTransactionStatus = 05) returns 2005600 with "Successful"'
        },
        example: {
          testCase: '2005600-success',
          partnerReferenceNo: '2020102900000000000001'
        }
      }, { status: 400 })
    }

    if (!partnerReferenceNo) {
      return NextResponse.json({
        error: 'partnerReferenceNo is required',
        note: 'You can use any existing order number, or a test order number. The callback will return the correct response format even if the order does not exist (for testing purposes).'
      }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const callbackUrl = `${baseUrl}/api/payments/dana/callback`

    // Simulate DANA webhook payload based on test case
    let webhookPayload: Record<string, unknown>
    let expectedResponseCode: string
    let expectedResponseMessage: string
    let simulateError = false

    if (testCase === '2005600-success') {
      // Test Case 1: Successful transaction (latestTransactionStatus = 00)
      webhookPayload = {
        responseCode: '2005400',
        responseMessage: 'Success',
        originalPartnerReferenceNo: partnerReferenceNo,
        originalReferenceNo: `REF-${Date.now()}`,
        latestTransactionStatus: '00', // Success
        transactionStatusDesc: 'SUCCESS',
        amount: {
          value: '100000.00',
          currency: 'IDR'
        }
      }
      expectedResponseCode = '2005600'
      expectedResponseMessage = 'Successful'
      console.log('[DANA WEBHOOK TEST] Testing successful transaction (latestTransactionStatus = 00)')
    } else if (testCase === '5005601-error') {
      // Test Case 2: Simulate internal server error for successful transaction
      webhookPayload = {
        responseCode: '2005400',
        responseMessage: 'Success',
        originalPartnerReferenceNo: partnerReferenceNo,
        originalReferenceNo: `REF-${Date.now()}`,
        latestTransactionStatus: '00', // Success
        transactionStatusDesc: 'SUCCESS',
        amount: {
          value: '100000.00',
          currency: 'IDR'
        }
      }
      expectedResponseCode = '5005601'
      expectedResponseMessage = 'Internal Server Error'
      simulateError = true
      console.log('[DANA WEBHOOK TEST] Testing internal server error (5005601) simulation')
    } else if (testCase === '2005600-expired') {
      // Test Case 3: Closed/Expired transaction (latestTransactionStatus = 05)
      webhookPayload = {
        responseCode: '2005400',
        responseMessage: 'Success',
        originalPartnerReferenceNo: partnerReferenceNo,
        originalReferenceNo: `REF-${Date.now()}`,
        latestTransactionStatus: '05', // Closed/Expired
        transactionStatusDesc: 'CLOSED',
        amount: {
          value: '100000.00',
          currency: 'IDR'
        }
      }
      expectedResponseCode = '2005600'
      expectedResponseMessage = 'Successful'
      console.log('[DANA WEBHOOK TEST] Testing closed/expired transaction (latestTransactionStatus = 05)')
    } else {
      return NextResponse.json({ error: 'Unknown test case' }, { status: 400 })
    }

    // Generate signature for webhook (optional, for testing)
    const privateKey = process.env.DANA_PRIVATE_KEY || ''
    const payloadString = JSON.stringify(webhookPayload)
    const signature = privateKey ? generateWebhookSignature(payloadString, privateKey) : 'test-signature'

    // Call the webhook callback endpoint
    const callbackUrlWithError = simulateError
      ? `${callbackUrl}?simulateError=true`
      : callbackUrl

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SIGNATURE': signature,
    }

    if (simulateError) {
      headers['X-SIMULATE-ERROR'] = 'true'
    }

    console.log('[DANA WEBHOOK TEST] Sending webhook to:', callbackUrlWithError)
    console.log('[DANA WEBHOOK TEST] simulateError flag:', simulateError)
    console.log('[DANA WEBHOOK TEST] Headers:', JSON.stringify(headers, null, 2))
    console.log('[DANA WEBHOOK TEST] Webhook payload:', JSON.stringify(webhookPayload, null, 2))

    try {
      const response = await fetch(callbackUrlWithError, {
        method: 'POST',
        headers,
        body: payloadString,
      })

      const responseText = await response.text()
      console.log('[DANA WEBHOOK TEST] Response status:', response.status)
      console.log('[DANA WEBHOOK TEST] Response body:', responseText)

      let responseData: { responseCode?: string; responseMessage?: string;[key: string]: unknown } = {}
      try {
        responseData = JSON.parse(responseText) as { responseCode?: string; responseMessage?: string;[key: string]: unknown }
      } catch {
        responseData = { message: responseText || 'Unknown error' }
      }

      const actualResponseCode = responseData.responseCode
      const actualResponseMessage = responseData.responseMessage

      // Verify the response
      if (actualResponseCode === expectedResponseCode && actualResponseMessage === expectedResponseMessage) {
        return NextResponse.json({
          success: true,
          testCase,
          message: `Webhook correctly returned ${expectedResponseCode} with message "${expectedResponseMessage}"`,
          expected: {
            responseCode: expectedResponseCode,
            responseMessage: expectedResponseMessage
          },
          actual: {
            responseCode: actualResponseCode,
            responseMessage: actualResponseMessage
          },
          verified: true
        })
      } else {
        return NextResponse.json({
          success: false,
          testCase,
          message: `Expected ${expectedResponseCode} but got ${actualResponseCode || 'unknown'}`,
          expected: {
            responseCode: expectedResponseCode,
            responseMessage: expectedResponseMessage
          },
          actual: {
            responseCode: actualResponseCode,
            responseMessage: actualResponseMessage
          },
          fullResponse: responseData,
          verified: false
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DANA WEBHOOK TEST] Request failed:', errorMessage)
      return NextResponse.json({
        success: false,
        testCase,
        error: 'Request failed',
        details: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[DANA WEBHOOK TEST] Test endpoint error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Test failed',
      details: errorMessage
    }, { status: 500 })
  }
}
