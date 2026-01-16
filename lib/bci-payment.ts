/**
 * BCI Payment Gateway Integration
 * Crypto payment gateway for IDRT and USDC tokens
 * Documentation: https://bci-payment-gateway.onrender.com/
 */

const BCI_API_BASE_URL = 'https://bci-payment-gateway.onrender.com/api/v1'

interface CreatePaymentRequest {
  orderId: string
  amount: number // Amount in smallest unit (e.g., rupiah for IDRT)
  token: 'IDRT' | 'USDC'
  description: string
}

interface CreatePaymentResponse {
  paymentId: string
  qrCode: string
  paymentLink: string
  orderId: string
  amount: number
  token: string
  status: string
}

interface PaymentStatusResponse {
  paymentId: string
  orderId: string
  status: 'pending' | 'completed' | 'failed' | 'expired'
  amount: number
  token: string
  transactionHash?: string
  createdAt: string
  updatedAt: string
}

/**
 * Create a crypto payment request
 */
export async function createCryptoPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  const apiKey = process.env.BCI_API_KEY

  if (!apiKey) {
    throw new Error('BCI API credentials not configured. Please set BCI_API_KEY in your environment variables.')
  }

  try {
    const response = await fetch(`${BCI_API_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: request.orderId,
        amount: request.amount,
        token: request.token,
        description: request.description,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`BCI API error: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[BCI PAYMENT] Error creating payment:', error)
    throw error
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentStatusResponse> {
  const apiKey = process.env.BCI_API_KEY

  if (!apiKey) {
    throw new Error('BCI API credentials not configured. Please set BCI_API_KEY in your environment variables.')
  }

  try {
    const response = await fetch(`${BCI_API_BASE_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`BCI API error: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[BCI PAYMENT] Error getting payment status:', error)
    throw error
  }
}

/**
 * Verify webhook signature (if BCI provides signature verification)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function verifyWebhookSignature(
  _payload: unknown,
  _signature: string
): boolean {
  // TODO: Implement signature verification if BCI provides it
  // For now, we'll rely on API key authentication
  // Parameters prefixed with _ to indicate intentionally unused
  return true
}
