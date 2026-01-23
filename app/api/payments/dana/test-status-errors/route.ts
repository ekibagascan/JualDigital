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
 * Generate timestamp in DANA format (GMT+7, Jakarta timezone)
 */
function generateTimestamp(): string {
  const now = new Date()
  const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
  const year = jakartaTime.getUTCFullYear()
  const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
  const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
  const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
}

/**
 * Generate X-EXTERNAL-ID (numeric, 1-36 chars)
 */
function generateExternalId(): string {
  const ts = Date.now().toString()
  const rand = Math.floor(Math.random() * 1e9).toString().padStart(9, '0')
  const id = `${ts}${rand}`
  return id.length > 36 ? id.substring(0, 36) : id
}

/**
 * Generate signature for DANA API request
 */
function generateSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  privateKey: string
): string {
  try {
    const minifiedBody = JSON.stringify(JSON.parse(body))
    const hash = crypto.createHash('sha256')
    hash.update(minifiedBody)
    const bodyHash = hash.digest('hex').toLowerCase()
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`
    const formattedKey = formatPemKey(privateKey, 'PRIVATE')
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(stringToSign)
    sign.end()
    const signature = sign.sign(formattedKey, 'base64')
    return signature
  } catch (error) {
    console.error('[DANA TEST] Error generating signature:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to generate signature: ${error.message}`)
    }
    throw new Error('Failed to generate signature: Unknown error')
  }
}

/**
 * Test endpoint to verify DANA status query error scenarios
 * This endpoint sends raw requests directly to DANA API to trigger specific error codes
 */
export async function POST(req: NextRequest) {
  try {
    const { testCase } = await req.json()

    const validCases = [
      '4045501-notfound',      // Transaction Not Found
      '4005502-invalid',       // Invalid Mandatory Field
      '4015500-unauthorized',  // Unauthorized / Invalid Signature
      '2005500-pending',       // Successful - Pending (01)
      '2005500-cancelled'      // Successful - Cancelled (05)
    ]

    if (!testCase || !validCases.includes(testCase)) {
      return NextResponse.json({
        error: 'Invalid test case',
        validCases,
        description: {
          '4045501-notfound': 'Test transaction not found error - query non-existent order',
          '4005502-invalid': 'Test invalid mandatory field error - send invalid request',
          '4015500-unauthorized': 'Test unauthorized/invalid signature error - send invalid signature',
          '2005500-pending': 'Test pending transaction status (latestTransactionStatus = 01)',
          '2005500-cancelled': 'Test cancelled transaction status (latestTransactionStatus = 05)'
        }
      }, { status: 400 })
    }

    const partnerId = process.env.DANA_CLIENT_ID || process.env.DANA_PARTNER_ID
    const merchantId = process.env.DANA_MERCHANT_ID
    const privateKey = process.env.DANA_PRIVATE_KEY
    const isSandbox = process.env.DANA_IS_SANDBOX === 'true' || !process.env.DANA_IS_SANDBOX || process.env.DANA_IS_SANDBOX === undefined

    if (!partnerId || !merchantId || !privateKey) {
      return NextResponse.json({
        error: 'DANA API credentials not configured'
      }, { status: 500 })
    }

    const baseUrl = isSandbox
      ? 'https://api.sandbox.dana.id'
      : 'https://api.dana.id'

    const path = '/payment-gateway/v1.0/debit/status.htm'
    const timestamp = generateTimestamp()
    const externalId = generateExternalId()

    let requestBody: Record<string, unknown>
    let expectedResponseCode: string
    let expectedResponseMessage: string
    let expectedTransactionStatus: string | undefined

    if (testCase === '4045501-notfound') {
      // Test 4045501: Transaction Not Found
      // Query a non-existent order number
      console.log('[DANA STATUS TEST] Testing 4045501 - Transaction Not Found')
      requestBody = {
        partnerReferenceNo: `NON-EXISTENT-${Date.now()}`, // Non-existent order number
        merchantId: merchantId,
      }
      expectedResponseCode = '4045501'
      expectedResponseMessage = 'Transaction Not Found'
    } else if (testCase === '4005502-invalid') {
      // Test 4005502: Invalid Mandatory Field
      // Send request with invalid partnerReferenceNo format (too long or invalid characters)
      console.log('[DANA STATUS TEST] Testing 4005502 - Invalid Mandatory Field')
      requestBody = {
        partnerReferenceNo: 'A'.repeat(100), // Invalid: too long (max 64 chars per DANA spec)
        merchantId: merchantId,
      }
      expectedResponseCode = '4005502'
      expectedResponseMessage = 'Invalid Mandatory Field'
    } else if (testCase === '4015500-unauthorized') {
      // Test 4015500: Unauthorized / Invalid Signature
      // Send request with invalid signature
      console.log('[DANA STATUS TEST] Testing 4015500 - Unauthorized / Invalid Signature')
      requestBody = {
        partnerReferenceNo: 'TEST-ORDER-001',
        merchantId: merchantId,
      }
      expectedResponseCode = '4015500'
      expectedResponseMessage = 'Unauthorized / Invalid Signature'
      // We'll use an invalid signature below
    } else if (testCase === '2005500-pending') {
      // Test 2005500 with latestTransactionStatus = 01 (Pending)
      // This requires an actual order with pending status in DANA system
      console.log('[DANA STATUS TEST] Testing 2005500 - Pending (01)')
      // Use a test order number - in real scenario, this would be an actual pending order
      requestBody = {
        partnerReferenceNo: 'TEST-PENDING-ORDER',
        merchantId: merchantId,
      }
      expectedResponseCode = '2005500'
      expectedResponseMessage = 'Successful'
      expectedTransactionStatus = '01'
    } else if (testCase === '2005500-cancelled') {
      // Test 2005500 with latestTransactionStatus = 05 (Cancelled)
      // This requires an actual order with cancelled status in DANA system
      console.log('[DANA STATUS TEST] Testing 2005500 - Cancelled (05)')
      // Use a test order number - in real scenario, this would be an actual cancelled order
      requestBody = {
        partnerReferenceNo: 'TEST-CANCELLED-ORDER',
        merchantId: merchantId,
      }
      expectedResponseCode = '2005500'
      expectedResponseMessage = 'Successful'
      expectedTransactionStatus = '05'
    } else {
      return NextResponse.json({ error: 'Unknown test case' }, { status: 400 })
    }

    const bodyString = JSON.stringify(requestBody)
    
    // Generate signature (or invalid signature for 4015500 test)
    let signature: string
    if (testCase === '4015500-unauthorized') {
      // Use invalid signature - wrong key or corrupted signature
      signature = 'INVALID_SIGNATURE_FOR_TESTING'
    } else {
      signature = generateSignature('POST', path, timestamp, bodyString, privateKey)
    }

    console.log('[DANA STATUS TEST] Sending request to DANA:', {
      url: `${baseUrl}${path}`,
      testCase,
      partnerReferenceNo: (requestBody as { partnerReferenceNo?: string }).partnerReferenceNo,
    })

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-PARTNER-ID': partnerId,
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-EXTERNAL-ID': externalId,
          'CHANNEL-ID': 'WEB',
        },
        body: bodyString,
      })

      const responseText = await response.text().catch(() => '')
      console.log('[DANA STATUS TEST] Response status:', response.status)
      console.log('[DANA STATUS TEST] Response body:', responseText)

      let responseData: { responseCode?: string; responseMessage?: string; latestTransactionStatus?: string; [key: string]: unknown } = {}
      try {
        responseData = JSON.parse(responseText) as { responseCode?: string; responseMessage?: string; latestTransactionStatus?: string; [key: string]: unknown }
      } catch {
        responseData = { message: responseText || 'Unknown error' }
      }

      const actualResponseCode = responseData.responseCode
      const actualResponseMessage = responseData.responseMessage
      const actualTransactionStatus = responseData.latestTransactionStatus

      // Verify the response
      if (testCase.startsWith('2005500-')) {
        // For success scenarios, check both responseCode and transactionStatus
        if (actualResponseCode === expectedResponseCode && 
            actualTransactionStatus === expectedTransactionStatus) {
          return NextResponse.json({
            success: true,
            testCase,
            message: `Status query correctly returned ${expectedResponseCode} with latestTransactionStatus ${expectedTransactionStatus}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedResponseMessage,
              latestTransactionStatus: expectedTransactionStatus
            },
            actual: {
              responseCode: actualResponseCode,
              responseMessage: actualResponseMessage,
              latestTransactionStatus: actualTransactionStatus
            },
            verified: true
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase,
            message: `Expected ${expectedResponseCode} with latestTransactionStatus ${expectedTransactionStatus}, but got ${actualResponseCode} with ${actualTransactionStatus || 'N/A'}`,
            expected: {
              responseCode: expectedResponseCode,
              responseMessage: expectedResponseMessage,
              latestTransactionStatus: expectedTransactionStatus
            },
            actual: {
              responseCode: actualResponseCode,
              responseMessage: actualResponseMessage,
              latestTransactionStatus: actualTransactionStatus
            },
            fullResponse: responseData,
            verified: false
          })
        }
      } else {
        // For error scenarios, check responseCode
        if (actualResponseCode === expectedResponseCode) {
          return NextResponse.json({
            success: true,
            testCase,
            message: `Error code ${expectedResponseCode} correctly returned`,
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
            message: `Expected error code ${expectedResponseCode} but got ${actualResponseCode || 'unknown'}`,
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
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DANA STATUS TEST] Request failed:', errorMessage)
      return NextResponse.json({
        success: false,
        testCase,
        error: 'Request failed',
        details: errorMessage
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
