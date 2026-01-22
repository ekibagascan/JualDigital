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
 * Test endpoint to verify DANA error handling
 * This endpoint sends raw requests directly to DANA to trigger specific error codes
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

    const path = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
    const timestamp = generateTimestamp()
    const externalId = generateExternalId()
    const baseUrlForRedirects = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const testOrderNumber = `TEST-${Date.now()}`

    let requestBody: Record<string, unknown>

    if (testCase === '4005401') {
      // Test 4005401: Invalid Field Format
      // Send request with invalid field formats that DANA will reject
      console.log('[DANA TEST] Testing 4005401 - Invalid Field Format')

      // Create request with invalid formats:
      // - Invalid timestamp format in validUpTo (wrong format)
      // - Invalid merchantTransType enum value
      // - Invalid amount format (without decimals)
      requestBody = {
        partnerReferenceNo: testOrderNumber,
        merchantId: merchantId,
        subMerchantId: '',
        amount: {
          value: '10000', // Invalid: should be "10000.00" with decimals
          currency: 'IDR',
        },
        externalStoreId: '',
        urlParams: [
          {
            url: `${baseUrlForRedirects}/payment/dana/finish`,
            type: 'PAY_RETURN',
            isDeeplink: 'Y',
          },
          {
            url: `${baseUrlForRedirects}/api/payments/dana/callback`,
            type: 'NOTIFICATION',
            isDeeplink: 'Y',
          }
        ],
        additionalInfo: {
          order: {
            orderTitle: 'Test Order',
            scenario: 'REDIRECT',
            merchantTransType: 'INVALID_TYPE', // Invalid: should be valid enum like 'SPECIAL_MOVIE', 'Retail', etc.
            buyer: {},
          },
          mcc: 'INVALID', // Invalid: should be valid MCC code like '5732'
          envInfo: {
            sourcePlatform: 'IPG',
            terminalType: 'SYSTEM',
            orderTerminalType: 'WEB',
          },
        },
        // Invalid validUpTo format - wrong timestamp format
        validUpTo: '2026-01-22T10:00:00', // Invalid: missing timezone (+07:00)
      }
    } else if (testCase === '4045418') {
      // Test 4045418: Inconsistent Request
      // This error occurs when using same partnerReferenceNo with different parameters
      // (Idempotent Key inconsistency)
      console.log('[DANA TEST] Testing 4045418 - Inconsistent Request')

      // Strategy: First create a valid order, then retry with same partnerReferenceNo
      // but different parameters (different amount, different urlParams, etc.)
      // Use a fixed partnerReferenceNo that we'll reuse
      const fixedOrderNumber = `TEST-4045418-${Date.now()}`
      
      // Step 1: Create a valid order first (this will succeed)
      const firstRequestBody = {
        partnerReferenceNo: fixedOrderNumber,
        merchantId: merchantId,
        subMerchantId: '',
        amount: {
          value: '10000.00',
          currency: 'IDR',
        },
        externalStoreId: '',
        urlParams: [
          {
            url: `${baseUrlForRedirects}/payment/dana/finish`,
            type: 'PAY_RETURN',
            isDeeplink: 'Y',
          },
          {
            url: `${baseUrlForRedirects}/api/payments/dana/callback`,
            type: 'NOTIFICATION',
            isDeeplink: 'Y',
          }
        ],
        additionalInfo: {
          order: {
            orderTitle: 'Test Order First',
            scenario: 'REDIRECT',
            merchantTransType: 'SPECIAL_MOVIE',
            buyer: {},
          },
          mcc: '5732',
          envInfo: {
            sourcePlatform: 'IPG',
            terminalType: 'SYSTEM',
            orderTerminalType: 'WEB',
          },
        },
        validUpTo: (() => {
          const now = new Date()
          const expirationTime = new Date(now.getTime() + (30 * 60 * 1000))
          const jakartaTime = new Date(expirationTime.getTime() + (7 * 60 * 60 * 1000))
          const year = jakartaTime.getUTCFullYear()
          const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
          const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
          const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
          const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
          const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
        })(),
      }

      // Create first order
      const firstBodyString = JSON.stringify(firstRequestBody)
      const firstSignature = generateSignature('POST', path, generateTimestamp(), firstBodyString, privateKey)
      const firstTimestamp = generateTimestamp()
      const firstExternalId = generateExternalId()

      try {
        const firstResponse = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-PARTNER-ID': partnerId,
            'X-TIMESTAMP': firstTimestamp,
            'X-SIGNATURE': firstSignature,
            'X-EXTERNAL-ID': firstExternalId,
            'CHANNEL-ID': 'WEB',
            'ORIGIN': baseUrlForRedirects,
          },
          body: firstBodyString,
        })
        const firstResponseText = await firstResponse.text()
        console.log('[DANA TEST] First order response:', firstResponseText)
      } catch (error) {
        console.log('[DANA TEST] First order failed (this is OK):', error)
      }

      // Step 2: Now retry with same partnerReferenceNo but DIFFERENT parameters
      // This should trigger 4045418
      requestBody = {
        partnerReferenceNo: fixedOrderNumber, // SAME as first order
        merchantId: merchantId,
        subMerchantId: '',
        amount: {
          value: '20000.00', // DIFFERENT amount
          currency: 'IDR',
        },
        externalStoreId: '',
        urlParams: [
          {
            url: `${baseUrlForRedirects}/payment/dana/finish-different`, // DIFFERENT URL
            type: 'PAY_RETURN',
            isDeeplink: 'Y',
          },
          {
            url: `${baseUrlForRedirects}/api/payments/dana/callback-different`, // DIFFERENT URL
            type: 'NOTIFICATION',
            isDeeplink: 'Y',
          }
        ],
        additionalInfo: {
          order: {
            orderTitle: 'Test Order Second', // DIFFERENT title
            scenario: 'REDIRECT',
            merchantTransType: 'SPECIAL_MOVIE',
            buyer: {},
          },
          mcc: '5732',
          envInfo: {
            sourcePlatform: 'IPG',
            terminalType: 'SYSTEM',
            orderTerminalType: 'WEB',
          },
        },
        validUpTo: (() => {
          const now = new Date()
          const expirationTime = new Date(now.getTime() + (30 * 60 * 1000))
          const jakartaTime = new Date(expirationTime.getTime() + (7 * 60 * 60 * 1000))
          const year = jakartaTime.getUTCFullYear()
          const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
          const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
          const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
          const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
          const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
        })(),
      }
    } else {
      return NextResponse.json({ error: 'Unknown test case' }, { status: 400 })
    }

    const bodyString = JSON.stringify(requestBody)
    const signature = generateSignature('POST', path, timestamp, bodyString, privateKey)

    console.log('[DANA TEST] Sending raw request to DANA:', {
      url: `${baseUrl}${path}`,
      testCase,
      requestBody
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
          'ORIGIN': baseUrlForRedirects,
        },
        body: bodyString,
      })

      const responseText = await response.text().catch(() => '')
      console.log('[DANA TEST] Response status:', response.status)
      console.log('[DANA TEST] Response body:', responseText)

      let responseData: { responseCode?: string; responseMessage?: string;[key: string]: unknown } = {}
      try {
        responseData = JSON.parse(responseText) as { responseCode?: string; responseMessage?: string;[key: string]: unknown }
      } catch {
        responseData = { message: responseText || 'Unknown error' }
      }

      const responseCode = responseData.responseCode

      if (testCase === '4005401') {
        if (responseCode === '4005401') {
          return NextResponse.json({
            success: true,
            testCase: '4005401',
            message: 'Invalid Field Format error correctly triggered and handled',
            responseCode: responseCode,
            responseMessage: responseData.responseMessage,
            verified: true
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase: '4005401',
            message: `Expected 4005401 but got ${responseCode || 'unknown'}`,
            responseCode: responseCode,
            responseMessage: responseData.responseMessage,
            fullResponse: responseData,
            verified: false
          })
        }
      } else if (testCase === '4045418') {
        if (responseCode === '4045418') {
          return NextResponse.json({
            success: true,
            testCase: '4045418',
            message: 'Inconsistent Request error correctly triggered and handled',
            responseCode: responseCode,
            responseMessage: responseData.responseMessage,
            verified: true
          })
        } else {
          return NextResponse.json({
            success: false,
            testCase: '4045418',
            message: `Expected 4045418 but got ${responseCode || 'unknown'}`,
            responseCode: responseCode,
            responseMessage: responseData.responseMessage,
            fullResponse: responseData,
            verified: false
          })
        }
      }

      return NextResponse.json({
        success: false,
        message: 'Unexpected test case',
        responseData
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[DANA TEST] Request failed:', errorMessage)
      return NextResponse.json({
        success: false,
        testCase,
        error: 'Request failed',
        details: errorMessage
      }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('[DANA TEST] Test endpoint error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Test failed',
      details: errorMessage
    }, { status: 500 })
  }
}
