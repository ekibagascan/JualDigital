/**
 * Midtrans Payment Gateway Integration
 * Using Midtrans Snap (dedicated UI) for fast integration
 */

import crypto from 'crypto'

export interface MidtransSnapTransaction {
  transaction_details: {
    order_id: string
    gross_amount: number
  }
  customer_details?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
  item_details?: Array<{
    id: string
    price: number
    quantity: number
    name: string
  }>
  callbacks?: {
    finish?: string
    error?: string
    pending?: string
  }
}

export interface MidtransSnapResponse {
  token: string
  redirect_url: string
}

export interface MidtransTransactionStatus {
  transaction_time: string
  transaction_status: string
  transaction_id: string
  status_message: string
  status_code: string
  signature_key: string
  payment_type: string
  order_id: string
  merchant_id: string
  gross_amount: string
  fraud_status: string
  currency: string
  settlement_time?: string
}

/**
 * Create a Midtrans Snap transaction
 * @param transactionData Transaction details
 * @returns Snap token and redirect URL
 */
export async function createSnapTransaction(
  transactionData: MidtransSnapTransaction
): Promise<MidtransSnapResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY is not configured')
  }

  // Use correct endpoint based on server key prefix
  // Sandbox keys start with "SB-Mid-server-", production keys start with "Mid-server-"
  const isSandbox = serverKey.startsWith('SB-Mid-server-')
  const baseUrl = isSandbox
    ? 'https://app.sandbox.midtrans.com'
    : 'https://app.midtrans.com'

  const authString = Buffer.from(`${serverKey}:`).toString('base64')

  try {
    const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(transactionData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[MIDTRANS] Snap transaction creation failed:', errorData)
      throw new Error(
        errorData.error_messages?.[0] || 
        `Midtrans API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return {
      token: data.token,
      redirect_url: data.redirect_url,
    }
  } catch (error) {
    console.error('[MIDTRANS] Error creating Snap transaction:', error)
    throw error
  }
}

/**
 * Get transaction status from Midtrans
 * @param orderId Order ID
 * @returns Transaction status
 */
export async function getTransactionStatus(
  orderId: string
): Promise<MidtransTransactionStatus> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY is not configured')
  }

  // Use correct endpoint based on server key prefix
  // Sandbox keys start with "SB-Mid-server-", production keys start with "Mid-server-"
  const isSandbox = serverKey.startsWith('SB-Mid-server-')
  const baseUrl = isSandbox
    ? 'https://api.sandbox.midtrans.com'
    : 'https://api.midtrans.com'

  const authString = Buffer.from(`${serverKey}:`).toString('base64')

  try {
    const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[MIDTRANS] Get transaction status failed:', errorData)
      throw new Error(
        errorData.error_messages?.[0] || 
        `Midtrans API error: ${response.status} ${response.statusText}`
      )
    }

    return await response.json()
  } catch (error) {
    console.error('[MIDTRANS] Error getting transaction status:', error)
    throw error
  }
}

/**
 * Verify webhook signature (optional but recommended)
 * @param orderId Order ID
 * @param statusCode Status code
 * @param grossAmount Gross amount
 * @param signatureKey Signature key from webhook
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  
  if (!serverKey) {
    console.warn('[MIDTRANS] Server key not configured, skipping signature verification')
    return true
  }

  // Create signature: SHA512(order_id + status_code + gross_amount + server_key)
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex')

  return hash === signatureKey
}
