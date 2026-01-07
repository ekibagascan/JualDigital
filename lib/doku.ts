import crypto from 'crypto'

// DOKU API Configuration
const DOKU_BASE_URL = process.env.DOKU_API_URL || 'https://api.doku.com'
const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || ''
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || ''
// DOKU Shared Key (Public Key) - used for webhook signature verification
export const DOKU_SHARED_KEY = process.env.DOKU_SHARED_KEY || ''

// Generate DOKU signature for request
export function generateDokuSignature(
  clientId: string,
  requestId: string,
  requestTarget: string,
  requestTimestamp: string,
  requestBody: string,
  secretKey: string
): string {
  // DOKU signature format: ClientId:RequestId:RequestTarget:RequestTimestamp:RequestBody
  const signatureString = `${clientId}:${requestId}:${requestTarget}:${requestTimestamp}:${requestBody}`
  
  // Create HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', secretKey)
  hmac.update(signatureString)
  return hmac.digest('hex')
}

// Verify DOKU signature from webhook
export function verifyDokuSignature(
  signature: string,
  clientId: string,
  requestId: string,
  requestTarget: string,
  requestTimestamp: string,
  requestBody: string,
  sharedKey: string
): boolean {
  try {
    const expectedSignature = generateDokuSignature(
      clientId,
      requestId,
      requestTarget,
      requestTimestamp,
      requestBody,
      sharedKey
    )
    
    // Use constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('[DOKU] Signature verification error:', error)
    return false
  }
}

// Generate request ID
function generateRequestId(): string {
  return `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Get ISO 8601 timestamp
function getRequestTimestamp(): string {
  return new Date().toISOString()
}

// Create DOKU payment request
export interface DokuPaymentRequest {
  order: {
    invoice_number: string
    amount: number
    currency?: string
  }
  customer: {
    id?: string
    name: string
    email: string
    phone?: string
  }
  payment: {
    payment_due_date?: number // minutes from now
  }
  url: {
    success_url: string
    failure_url: string
    notification_url: string
  }
}

export interface DokuPaymentResponse {
  response: {
    result: {
      invoice_number: string
      virtual_account_info?: {
        virtual_account_number: string
        how_to_pay_page?: string
        how_to_pay_api?: string
      }
      payment_code?: string
      payment_url?: string
      qr_string?: string
      expires_at?: string
    }
  }
}

// Create payment using DOKU Direct API (Non-SNAP)
export async function createDokuPayment(
  paymentData: DokuPaymentRequest
): Promise<DokuPaymentResponse> {
  const requestId = generateRequestId()
  const requestTimestamp = getRequestTimestamp()
  const requestTarget = '/checkout/v1/payment'
  
  // Prepare request body
  const requestBody = JSON.stringify({
    order: {
      invoice_number: paymentData.order.invoice_number,
      amount: paymentData.order.amount,
      currency: paymentData.order.currency || 'IDR',
    },
    customer: {
      id: paymentData.customer.id,
      name: paymentData.customer.name,
      email: paymentData.customer.email,
      phone: paymentData.customer.phone,
    },
    payment: {
      payment_due_date: paymentData.payment.payment_due_date || 60, // 60 minutes default
    },
    url: {
      success_url: paymentData.url.success_url,
      failure_url: paymentData.url.failure_url,
      notification_url: paymentData.url.notification_url,
    },
  })

  // Generate signature
  const signature = generateDokuSignature(
    DOKU_CLIENT_ID,
    requestId,
    requestTarget,
    requestTimestamp,
    requestBody,
    DOKU_SECRET_KEY
  )

  // Make API request
  const response = await fetch(`${DOKU_BASE_URL}${requestTarget}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': DOKU_CLIENT_ID,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      'Signature': `HMACSHA256=${signature}`,
    },
    body: requestBody,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.response?.result?.message ||
      errorData.message ||
      `DOKU API error: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

// Create payment using DOKU SNAP (for e-wallets, QR codes, etc.)
export interface DokuSnapRequest {
  order: {
    invoice_number: string
    amount: number
    currency?: string
  }
  customer: {
    id?: string
    name: string
    email: string
    phone?: string
  }
  payment: {
    payment_due_date?: number
  }
  url: {
    success_url: string
    failure_url: string
    notification_url: string
  }
}

export async function createDokuSnapPayment(
  paymentData: DokuSnapRequest
): Promise<DokuPaymentResponse> {
  const requestId = generateRequestId()
  const requestTimestamp = getRequestTimestamp()
  const requestTarget = '/checkout/v1/payment'
  
  // Prepare request body
  const requestBody = JSON.stringify({
    order: {
      invoice_number: paymentData.order.invoice_number,
      amount: paymentData.order.amount,
      currency: paymentData.order.currency || 'IDR',
    },
    customer: {
      id: paymentData.customer.id,
      name: paymentData.customer.name,
      email: paymentData.customer.email,
      phone: paymentData.customer.phone,
    },
    payment: {
      payment_due_date: paymentData.payment.payment_due_date || 60,
    },
    url: {
      success_url: paymentData.url.success_url,
      failure_url: paymentData.url.failure_url,
      notification_url: paymentData.url.notification_url,
    },
  })

  // Generate signature
  const signature = generateDokuSignature(
    DOKU_CLIENT_ID,
    requestId,
    requestTarget,
    requestTimestamp,
    requestBody,
    DOKU_SECRET_KEY
  )

  // Make API request
  const response = await fetch(`${DOKU_BASE_URL}${requestTarget}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': DOKU_CLIENT_ID,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      'Signature': `HMACSHA256=${signature}`,
    },
    body: requestBody,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.response?.result?.message ||
      errorData.message ||
      `DOKU API error: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

// DOKU Checkout Request (Hosted Payment Page)
export interface DokuCheckoutRequest {
  order: {
    invoice_number: string
    amount: number
    currency?: string
    line_items?: Array<{
      name: string
      price: number
      quantity: number
    }>
  }
  customer: {
    id?: string
    name: string
    email: string
    phone?: string
  }
  payment: {
    payment_due_date?: number // minutes from now
  }
  url: {
    success_url: string
    failure_url: string
    notification_url: string
  }
  additional_info?: {
    theme?: {
      color?: string
    }
    language?: string
  }
}

export interface DokuCheckoutResponse {
  response: {
    result: {
      checkout_url: string
      invoice_number: string
      expires_at?: string
    }
  }
}

// Create DOKU Checkout session (Hosted Payment Page)
export async function createDokuCheckout(
  checkoutData: DokuCheckoutRequest
): Promise<DokuCheckoutResponse> {
  const requestId = generateRequestId()
  const requestTimestamp = getRequestTimestamp()
  const requestTarget = '/checkout/v1/payment'
  
  // Prepare request body
  const requestBody = JSON.stringify({
    order: {
      invoice_number: checkoutData.order.invoice_number,
      amount: checkoutData.order.amount,
      currency: checkoutData.order.currency || 'IDR',
      line_items: checkoutData.order.line_items || [],
    },
    customer: {
      id: checkoutData.customer.id,
      name: checkoutData.customer.name,
      email: checkoutData.customer.email,
      phone: checkoutData.customer.phone,
    },
    payment: {
      payment_due_date: checkoutData.payment.payment_due_date || 60, // 60 minutes default
    },
    url: {
      success_url: checkoutData.url.success_url,
      failure_url: checkoutData.url.failure_url,
      notification_url: checkoutData.url.notification_url,
    },
    additional_info: checkoutData.additional_info || {},
  })

  // Generate signature
  const signature = generateDokuSignature(
    DOKU_CLIENT_ID,
    requestId,
    requestTarget,
    requestTimestamp,
    requestBody,
    DOKU_SECRET_KEY
  )

  // Make API request
  const response = await fetch(`${DOKU_BASE_URL}${requestTarget}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': DOKU_CLIENT_ID,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      'Signature': `HMACSHA256=${signature}`,
    },
    body: requestBody,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.response?.result?.message ||
      errorData.message ||
      `DOKU API error: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

// Get payment status
export async function getDokuPaymentStatus(invoiceNumber: string): Promise<Record<string, unknown>> {
  const requestId = generateRequestId()
  const requestTimestamp = getRequestTimestamp()
  const requestTarget = `/orders/v1/status/${invoiceNumber}`
  
  // Empty body for GET-like requests
  const requestBody = ''
  
  // Generate signature
  const signature = generateDokuSignature(
    DOKU_CLIENT_ID,
    requestId,
    requestTarget,
    requestTimestamp,
    requestBody,
    DOKU_SECRET_KEY
  )

  const response = await fetch(`${DOKU_BASE_URL}${requestTarget}`, {
    method: 'GET',
    headers: {
      'Client-Id': DOKU_CLIENT_ID,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      'Signature': `HMACSHA256=${signature}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.response?.result?.message ||
      errorData.message ||
      `DOKU API error: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

