/**
 * DANA Gapura Payment Gateway Integration
 * Using DANA Hosted Checkout Page for payment processing
 */

import crypto from 'crypto'

export interface DanaCreateOrderRequest {
  partnerReferenceNo: string
  merchantId: string
  amount: {
    value: string
    currency: string
  }
  validUpTo?: string // ISO 8601 format: YYYY-MM-DDTHH:mm:ss+07:00
  disabledPaymentMethods?: string[]
  scenario?: 'REDIRECT' | 'API'
  webRedirectUrl?: string
  finishNotifyUrl?: string
  customer?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  orderItems?: Array<{
    name: string
    price: {
      value: string
      currency: string
    }
    quantity: number
  }>
}

export interface DanaCreateOrderResponse {
  responseCode: string
  responseMessage: string
  referenceNo?: string
  partnerReferenceNo?: string
  webRedirectUrl?: string
}

export interface DanaTransactionStatus {
  responseCode: string
  responseMessage: string
  referenceNo?: string
  partnerReferenceNo?: string
  transactionStatus?: string
  latestTransactionStatus?: string // Alternative field name
  transactionStatusDesc?: string
  amount?: {
    value: string
    currency: string
  }
}

export interface DanaWebhookPayload {
  responseCode: string
  responseMessage: string
  referenceNo?: string
  partnerReferenceNo?: string
  transactionStatus?: string
  amount?: {
    value: string
    currency: string
  }
  paymentInfo?: {
    paymentMethod?: string
    paymentMethodType?: string
  }
}

/**
 * Generate timestamp in DANA format (GMT+7, Jakarta timezone)
 * Format: YYYY-MM-DDTHH:mm:ss+07:00
 */
function generateTimestamp(): string {
  const now = new Date()
  // Convert to GMT+7 (Jakarta timezone)
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
 * Format RSA key to PEM format if needed
 */
function formatPemKey(rawKey: string, type: 'PRIVATE' | 'PUBLIC'): string {
  if (!rawKey) {
    throw new Error(`DANA ${type} key is empty`)
  }

  // Normalize escaped newlines and trim spaces/quotes
  let key = rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim()

  // Remove existing headers/footers if present to normalize
  key = key.replace(/-----BEGIN.*?-----\n?/g, '')
  key = key.replace(/\n?-----END.*?-----/g, '')
  key = key.replace(/\s+/g, '') // Remove all whitespace

  // Format key with proper PEM headers
  const header = `-----BEGIN ${type} KEY-----\n`
  const footer = `\n-----END ${type} KEY-----`

  // Insert newlines every 64 characters for proper PEM format
  const formattedKey = key.match(/.{1,64}/g)?.join('\n') || key

  const result = header + formattedKey + footer

  // Validate key length (RSA keys should be substantial)
  if (key.length < 100) {
    throw new Error(`DANA ${type} key appears to be invalid or truncated (length: ${key.length})`)
  }

  return result
}

/**
 * Generate X-EXTERNAL-ID (numeric, 1-36 chars)
 */
function generateExternalId(): string {
  // Use timestamp + random to keep numeric and unique
  const ts = Date.now().toString() // ~13 digits
  const rand = Math.floor(Math.random() * 1e9).toString().padStart(9, '0') // 9 digits
  const id = `${ts}${rand}`
  // Ensure max 36 chars
  return id.length > 36 ? id.substring(0, 36) : id
}

/**
 * Format amount to DANA-required string with two decimals (e.g. 10000.00)
 */
function formatAmountValue(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) {
    throw new Error(`Invalid amount value: ${value}`)
  }
  return num.toFixed(2)
}

/**
 * Generate signature for DANA API request
 * Signature format: METHOD:PATH:lowercase(hex(SHA256(minified_body))):TIMESTAMP
 * Based on DANA documentation: https://dashboard.dana.id/api-docs-v2/guide/authentication
 */
function generateSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  privateKey: string
): string {
  try {
    // Minify JSON body (remove whitespace)
    const minifiedBody = JSON.stringify(JSON.parse(body))

    // Calculate SHA-256 hash of minified body
    const hash = crypto.createHash('sha256')
    hash.update(minifiedBody)
    const bodyHash = hash.digest('hex').toLowerCase()

    // Create string to sign: METHOD:PATH:HASH:TIMESTAMP
    const stringToSign = `${method}:${path}:${bodyHash}:${timestamp}`

    // Format private key to PEM if needed
    const formattedKey = formatPemKey(privateKey, 'PRIVATE')

    // Sign using RSA-SHA256
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(stringToSign)
    sign.end()

    // Use private key to sign
    const signature = sign.sign(formattedKey, 'base64')
    return signature
  } catch (error) {
    console.error('[DANA] Error generating signature:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to generate signature: ${error.message}`)
    }
    throw new Error('Failed to generate signature: Unknown error')
  }
}

/** Last create-transaction request/response (for DANA pilot submission - get via GET /api/payments/dana/last-create-payload) */
export type CreatePayloadEntry = {
  request: { url: string; method: string; headers: Record<string, string>; body: string }
  response: { status: number; body: string }
  capturedAt: string
}

let lastCreatePayload: CreatePayloadEntry | null = null

/** Create payloads by order (partnerReferenceNo) - for VA capture when callback arrives. Keep last 50. */
const CREATE_PAYLOAD_CACHE_MAX = 50
const createPayloadByOrder = new Map<string, CreatePayloadEntry>()

export function getLastCreatePayload() {
  return lastCreatePayload
}

/** Last create-transaction for a VA (virtual account) payment - set when DANA callback indicates VA. */
let lastVACreatePayload: CreatePayloadEntry | null = null

export function getLastVACreatePayload() {
  return lastVACreatePayload
}

/**
 * Call from DANA callback when payment is VA. Copies the stored create payload for this order to lastVACreatePayload.
 * GET /api/payments/dana/last-va-payload returns it.
 */
export function setLastVACreatePayloadFromOrder(partnerReferenceNo: string) {
  const payload = createPayloadByOrder.get(partnerReferenceNo)
  if (payload) {
    lastVACreatePayload = payload
    console.log('[DANA] Set last VA create payload for order:', partnerReferenceNo)
  }
}

/** Copy last create payload to last VA payload (for manual capture when webhook does not send payment method). */
export function setLastVACreatePayloadFromLastCreate() {
  if (lastCreatePayload) {
    lastVACreatePayload = lastCreatePayload
    console.log('[DANA] Set last VA create payload from last create (manual)')
  }
}

/** Returns true if webhook body indicates VA (virtual account) payment. */
export function isVAPaymentFromWebhookBody(body: Record<string, unknown>): boolean {
  const paymentMethod = (body.paymentMethodType ?? body.paymentMethod ?? body.payment_method) as string | undefined
  const additionalInfo = body.additionalInfo as Record<string, unknown> | undefined
  const paymentInfo = (body.paymentInfo ?? additionalInfo?.paymentInfo) as Record<string, unknown> | undefined
  const infoPaymentMethod = (paymentInfo?.paymentMethodType ?? paymentInfo?.paymentMethod ?? additionalInfo?.paymentMethodType) as string | undefined
  const str = [paymentMethod, infoPaymentMethod].filter(Boolean).join(' ').toUpperCase()
  const vaKeywords = ['VA', 'VIRTUAL_ACCOUNT', 'VIRTUAL ACCOUNT', 'BANK_TRANSFER', 'VIRTUAL_BANK', 'BANK_VA']
  return vaKeywords.some((k) => str.includes(k))
}

/**
 * Create DANA order for hosted checkout
 * @param orderData Order details
 * @returns Order response with webRedirectUrl
 */
export async function createDanaOrder(
  orderData: DanaCreateOrderRequest
): Promise<DanaCreateOrderResponse> {
  // DANA uses Client ID as Partner ID in headers
  const partnerId = process.env.DANA_CLIENT_ID || process.env.DANA_PARTNER_ID
  const merchantId = process.env.DANA_MERCHANT_ID || orderData.merchantId
  const privateKey = process.env.DANA_PRIVATE_KEY
  const isSandbox = process.env.DANA_IS_SANDBOX === 'true' || !process.env.DANA_IS_SANDBOX || process.env.DANA_IS_SANDBOX === undefined

  if (!partnerId || !merchantId || !privateKey) {
    throw new Error('DANA API credentials not configured. Please set DANA_CLIENT_ID (or DANA_PARTNER_ID), DANA_MERCHANT_ID, and DANA_PRIVATE_KEY in your environment variables.')
  }

  const baseUrl = isSandbox
    ? 'https://api.sandbox.dana.id'
    : (process.env.DANA_API_BASE_URL || 'https://api.dana.id')

  const path = '/payment-gateway/v1.0/debit/payment-host-to-host.htm'
  const timestamp = generateTimestamp()

  // Generate X-EXTERNAL-ID (numeric unique) - must be before requestBody
  const externalId = generateExternalId()

  // Prepare request body for hosted checkout
  // Based on DANA's example payload
  const requestBody: Record<string, unknown> = {
    partnerReferenceNo: orderData.partnerReferenceNo,
    merchantId: merchantId,
    subMerchantId: '', // Empty string as per DANA example
    amount: {
      value: formatAmountValue(orderData.amount.value),
      currency: orderData.amount.currency,
    },
    externalStoreId: 'JUALDIGI',
  }

  // urlParams is REQUIRED for hosted checkout - must include PAY_RETURN and NOTIFICATION
  const baseUrlForRedirects = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
  const webRedirectUrl = orderData.webRedirectUrl || `${baseUrlForRedirects}/payment/dana/finish`
  const finishNotifyUrl = orderData.finishNotifyUrl || `${baseUrlForRedirects}/api/payments/dana/callback`

  requestBody.urlParams = [
    {
      url: webRedirectUrl,
      type: 'PAY_RETURN',
      isDeeplink: 'Y' // Changed to 'Y' as per DANA example
    },
    {
      url: finishNotifyUrl,
      type: 'NOTIFICATION',
      isDeeplink: 'Y' // Changed to 'Y' as per DANA example
    }
  ]

  // Build additionalInfo.order structure for hosted checkout (REDIRECT scenario)
  // Based on DANA's example payload
  const orderTitle = orderData.orderItems && orderData.orderItems.length > 0
    ? (orderData.orderItems[0].name || `Order ${orderData.partnerReferenceNo}`)
    : `Order ${orderData.partnerReferenceNo}`

  // Ensure orderTitle doesn't exceed 64 characters (DANA limit)
  const truncatedOrderTitle = orderTitle.length > 64 ? orderTitle.substring(0, 61) + '...' : orderTitle

  const orderInfo: Record<string, unknown> = {
    orderTitle: truncatedOrderTitle,
    scenario: 'REDIRECT', // Must be REDIRECT for hosted checkout
    merchantTransType: 'SPECIAL_MOVIE', // Changed to match DANA example
    buyer: {}, // Empty object as per DANA example
  }

  // Add required fields for hosted checkout - simplified to match DANA example
  requestBody.additionalInfo = {
    order: orderInfo,
    mcc: '5732', // Changed to match DANA example
    envInfo: {
      // Only include the 3 fields from DANA's example
      sourcePlatform: 'IPG',
      terminalType: 'SYSTEM',
      orderTerminalType: 'WEB',
    },
  }

  // validUpTo is REQUIRED for hosted checkout - set expiration time (max 30 minutes from now as per DANA requirement)
  if (orderData.validUpTo) {
    requestBody.validUpTo = orderData.validUpTo
  } else {
    // Generate validUpTo: 30 minutes from now in GMT+7 (DANA requirement: max 30 minutes)
    const now = new Date()
    const expirationTime = new Date(now.getTime() + (30 * 60 * 1000)) // 30 minutes
    const jakartaTime = new Date(expirationTime.getTime() + (7 * 60 * 60 * 1000))
    const year = jakartaTime.getUTCFullYear()
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0')
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0')
    const hours = String(jakartaTime.getUTCHours()).padStart(2, '0')
    const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0')
    requestBody.validUpTo = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
  }
  // Note: disabledPayMethods removed - may cause issues if not properly formatted

  // Validate required fields before proceeding
  if (!requestBody.urlParams || (requestBody.urlParams as Array<unknown>).length === 0) {
    throw new Error('urlParams is required for DANA hosted checkout')
  }
  if (!requestBody.additionalInfo || !(requestBody.additionalInfo as { order?: unknown }).order) {
    throw new Error('additionalInfo.order is required for DANA hosted checkout')
  }

  const bodyString = JSON.stringify(requestBody)

  // Generate signature
  let signature: string
  try {
    signature = generateSignature('POST', path, timestamp, bodyString, privateKey)
  } catch (sigError) {
    console.error('[DANA] Signature generation failed:', sigError)
    throw new Error(`Failed to generate signature: ${sigError instanceof Error ? sigError.message : 'Unknown error'}`)
  }

  // Log request for debugging (remove sensitive data in production)
  console.log('[DANA] Create order request:', {
    url: `${baseUrl}${path}`,
    headers: {
      'X-PARTNER-ID': partnerId,
      'X-TIMESTAMP': timestamp,
      'X-EXTERNAL-ID': externalId,
      'CHANNEL-ID': 'WEB',
    },
    body: requestBody,
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
        'ORIGIN': process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id',
      },
      body: bodyString,
    })

    const responseText = await response.text().catch(() => '')
    console.log('[DANA] Create order response status:', response.status)
    console.log('[DANA] Create order response body:', responseText)

    // Capture for DANA pilot submission (request + response)
    const partnerRef = orderData.partnerReferenceNo
    const captured = {
      request: {
        url: `${baseUrl}${path}`,
        method: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-PARTNER-ID': partnerId,
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': '[REDACTED]',
          'X-EXTERNAL-ID': externalId,
          'CHANNEL-ID': 'WEB',
          'ORIGIN': process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id',
        },
        body: bodyString,
      },
      response: { status: response.status, body: responseText },
      capturedAt: new Date().toISOString(),
    }
    lastCreatePayload = captured
    createPayloadByOrder.set(partnerRef, captured)
    if (createPayloadByOrder.size > CREATE_PAYLOAD_CACHE_MAX) {
      const firstKey = createPayloadByOrder.keys().next().value
      if (firstKey) createPayloadByOrder.delete(firstKey)
    }

    if (!response.ok) {
      let errorData: { responseCode?: string; responseMessage?: string; message?: string } = {}
      try {
        errorData = JSON.parse(responseText) as { responseCode?: string; responseMessage?: string; message?: string }
      } catch {
        errorData = { message: responseText || 'Unknown error' }
      }
      console.error('[DANA] Create order failed - Status:', response.status)
      console.error('[DANA] Create order failed - Response Code:', errorData.responseCode)
      console.error('[DANA] Create order failed - Response Message:', errorData.responseMessage)
      console.error('[DANA] Create order failed - Full Response:', errorData)

      // Handle specific error codes
      if (errorData.responseCode === '4005401') {
        console.error('[DANA] Error 4005401 - Invalid Field Format detected')
        throw new Error(`DANA Invalid Field Format (4005401): ${errorData.responseMessage || 'One or more fields have invalid format. Please check field types, formats, and enum values.'}`)
      }

      if (errorData.responseCode === '4045418') {
        console.error('[DANA] Error 4045418 - Inconsistent Request detected')
        throw new Error(`DANA Inconsistent Request (4045418): ${errorData.responseMessage || 'Request has inconsistencies. Please check required fields and their relationships (e.g., amount mismatch, missing conditional fields).'}`)
      }

      const errorMsg = errorData.responseMessage ||
        errorData.message ||
        `DANA API error: ${response.status} ${response.statusText}`
      throw new Error(errorMsg)
    }

    let data: DanaCreateOrderResponse
    try {
      data = JSON.parse(responseText) as DanaCreateOrderResponse
    } catch (parseError) {
      console.error('[DANA] Failed to parse response JSON:', parseError)
      throw new Error(`Invalid response from DANA API: ${responseText.substring(0, 200)}`)
    }

    console.log('[DANA] Create order response:', data)

    if (data.responseCode !== '2005400') {
      console.error('[DANA] Create order error - Response Code:', data.responseCode)
      console.error('[DANA] Create order error - Response Message:', data.responseMessage)
      console.error('[DANA] Create order error - Full Response:', data)

      // Handle specific error codes
      if (data.responseCode === '4005401') {
        // Invalid Field Format - field has wrong format
        throw new Error(`DANA Invalid Field Format (${data.responseCode}): ${data.responseMessage || 'One or more fields have invalid format. Please check field types and formats.'}`)
      }

      if (data.responseCode === '4045418') {
        // Inconsistent Request - request has inconsistencies
        throw new Error(`DANA Inconsistent Request (${data.responseCode}): ${data.responseMessage || 'Request has inconsistencies. Please check required fields and their relationships.'}`)
      }

      if (data.responseCode === '4005402') {
        // Missing or Invalid Format on Any Mandatory Field
        throw new Error(`DANA Missing/Invalid Mandatory Field (${data.responseCode}): ${data.responseMessage || 'One or more mandatory fields are missing or have invalid format.'}`)
      }

      // 5005400 is "General Error" - might be temporary server issue
      if (data.responseCode === '5005400') {
        throw new Error(`DANA General Error (${data.responseCode}): ${data.responseMessage || 'Server-side error. Please retry or contact DANA support.'}`)
      }

      throw new Error(data.responseMessage || `Failed to create DANA order (code: ${data.responseCode})`)
    }

    return data
  } catch (error) {
    console.error('[DANA] Error creating order:', error)
    if (error instanceof Error) {
      // Preserve the original error message
      throw error
    }
    throw new Error(`Unknown error creating DANA order: ${String(error)}`)
  }
}

/**
 * Query payment status from DANA
 * @param partnerReferenceNo Partner reference number (order number)
 * @returns Transaction status
 */
export async function queryPaymentStatus(
  partnerReferenceNo: string
): Promise<DanaTransactionStatus> {
  // DANA uses Client ID as Partner ID in headers
  const partnerId = process.env.DANA_CLIENT_ID || process.env.DANA_PARTNER_ID
  const merchantId = process.env.DANA_MERCHANT_ID
  const privateKey = process.env.DANA_PRIVATE_KEY
  const isSandbox = process.env.DANA_IS_SANDBOX === 'true' || !process.env.DANA_IS_SANDBOX || process.env.DANA_IS_SANDBOX === undefined

  if (!partnerId || !merchantId || !privateKey) {
    throw new Error('DANA API credentials not configured')
  }

  const baseUrl = isSandbox
    ? 'https://api.sandbox.dana.id'
    : (process.env.DANA_API_BASE_URL || 'https://api.dana.id')

  const path = '/payment-gateway/v1.0/debit/status.htm'
  const timestamp = generateTimestamp()

  // Generate X-EXTERNAL-ID (numeric unique) - must be before requestBody
  const externalId = generateExternalId()

  // Note: externalId is in header only, not in body
  // DANA requires serviceCode and originalPartnerReferenceNo for status query
  const requestBody = {
    originalPartnerReferenceNo: partnerReferenceNo,
    originalReferenceNo: null,
    serviceCode: '54',
    merchantId,
  }

  const bodyString = JSON.stringify(requestBody)

  console.log('[DANA] Query status request:', {
    partnerReferenceNo,
    merchantId,
    path,
    baseUrl,
    isSandbox
  })

  const signature = generateSignature('POST', path, timestamp, bodyString, privateKey)

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
    console.log('[DANA] Query payment status response status:', response.status)
    console.log('[DANA] Query payment status response body (raw):', responseText)
    console.log('[DANA] Query payment status - partnerReferenceNo:', partnerReferenceNo)

    if (!response.ok) {
      let errorData: { responseCode?: string; responseMessage?: string; message?: string } = {}
      try {
        errorData = JSON.parse(responseText) as { responseCode?: string; responseMessage?: string; message?: string }
      } catch {
        errorData = { message: responseText || 'Unknown error' }
      }
      console.error('[DANA] Query payment status failed - HTTP Status:', response.status)
      console.error('[DANA] Query payment status failed - DANA Response Code:', errorData.responseCode)
      console.error('[DANA] Query payment status failed - DANA Response Message:', errorData.responseMessage)
      console.error('[DANA] Query payment status failed - Full Response:', errorData)

      // Include DANA error code in the error message for better debugging
      const errorMessage = errorData.responseMessage || errorData.message || `DANA API error: ${response.status} ${response.statusText}`
      const errorWithCode = errorData.responseCode
        ? `DANA Error ${errorData.responseCode}: ${errorMessage}`
        : errorMessage

      throw new Error(errorWithCode)
    }

    let data: DanaTransactionStatus
    try {
      data = JSON.parse(responseText) as DanaTransactionStatus
    } catch (parseError) {
      console.error('[DANA] Failed to parse response JSON:', parseError)
      throw new Error(`Invalid response from DANA API: ${responseText.substring(0, 200)}`)
    }

    console.log('[DANA] Query payment status response:', data)

    // Check if responseCode indicates an error (even if HTTP status is 200)
    // Status query endpoint uses 2005500 for success (not 2005400 which is for order creation)
    const successCodes = ['2005500', '2005400'] // Support both codes
    if (data.responseCode && !successCodes.includes(data.responseCode)) {
      console.warn('[DANA] Query payment status returned error code:', data.responseCode, data.responseMessage)
      // For specific error codes, throw with the error code so caller can handle it
      if (data.responseCode === '4045501') {
        throw new Error(`DANA Transaction Not Found (4045501): ${data.responseMessage || 'Transaction not found in DANA system'}`)
      } else if (data.responseCode === '4005502') {
        throw new Error(`DANA Invalid Mandatory Field (4005502): ${data.responseMessage || 'Invalid mandatory field'}`)
      } else if (data.responseCode === '5005501') {
        throw new Error(`DANA Internal Server Error (5005501): ${data.responseMessage || 'Internal server error'}`)
      } else if (data.responseCode === '4015500') {
        throw new Error(`DANA Unauthorized (4015500): ${data.responseMessage || 'Unauthorized or invalid signature'}`)
      }
      // For other error codes, don't throw - return the data so caller can handle it
    } else if (data.responseCode === '2005500') {
      console.log('[DANA] Query payment status successful (2005500)')
    }

    return data
  } catch (error) {
    console.error('[DANA] Error querying payment status:', error)
    throw error
  }
}

/**
 * Verify webhook signature from DANA
 * @param payload Webhook payload
 * @param signature Signature from X-SIGNATURE header
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const publicKey = process.env.DANA_PUBLIC_KEY

  if (!publicKey) {
    console.warn('[DANA] Public key not configured, skipping signature verification')
    return true
  }

  try {
    // Format public key to PEM if needed
    const formattedKey = formatPemKey(publicKey, 'PUBLIC')

    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(payload)
    verify.end()

    return verify.verify(formattedKey, signature, 'base64')
  } catch (error) {
    console.error('[DANA] Error verifying webhook signature:', error)
    return false
  }
}
