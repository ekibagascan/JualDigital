// Xendit Payment Methods for Indonesia
export const PAYMENT_METHODS = {
  E_WALLET: {
    OVO: 'OVO',
    DANA: 'DANA',
    LINKAJA: 'LINKAJA',
    SHOPEEPAY: 'SHOPEEPAY',
  },
  BANK_TRANSFER: {
    BCA: 'BCA',
    BNI: 'BNI',
    BRI: 'BRI',
    MANDIRI: 'MANDIRI',
  },
  CREDIT_CARD: 'CREDIT_CARD',
  QRIS: 'QRIS',
  RETAIL_OUTLET: {
    INDOMARET: 'INDOMARET',
    ALFAMART: 'ALFAMART',
  },
}

// Xendit Payment Gateway Integration
export interface XenditPaymentRequest {
  amount: number
  currency: string
  payment_method: string
  customer: {
    name: string
    email: string
    phone?: string
  }
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  order_id: string
  description?: string
}

export interface XenditPaymentResponse {
  id: string
  status: string
  amount: number
  currency: string
  payment_method: string
  invoice_url?: string
  transaction_id?: string
  created_at: string
}

export class XenditAPI {
  private baseUrl: string
  private secretKey: string
  private publicKey: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_XENDIT_API_URL || 'https://api.xendit.co'
    this.secretKey = process.env.XENDIT_SECRET_KEY || ''
    this.publicKey = process.env.NEXT_PUBLIC_XENDIT_PUBLIC_KEY || ''
  }

  async createPayment(paymentData: XenditPaymentRequest): Promise<XenditPaymentResponse> {
    try {
      // Map payment method to Xendit format
      let xenditPaymentMethod = paymentData.payment_method
      
      // Handle QRIS specifically
      if (paymentData.payment_method === 'qris') {
        xenditPaymentMethod = 'QRIS'
      }
      
      const response = await fetch(`${this.baseUrl}/v2/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
        body: JSON.stringify({
          external_id: paymentData.order_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description || 'Digital Product Purchase',
          customer: paymentData.customer,
          items: paymentData.items,
          payment_methods: [xenditPaymentMethod],
          should_send_email: true,
          success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
          failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Payment creation failed')
      }

      const data = await response.json()
      
      return {
        id: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        payment_method: paymentData.payment_method,
        invoice_url: data.invoice_url,
        transaction_id: data.external_id,
        created_at: data.created,
      }
    } catch (error) {
      console.error('Xendit payment error:', error)
      throw new Error('Payment processing failed')
    }
  }

  async getPaymentStatus(paymentId: string): Promise<XenditPaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/invoices/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get payment status')
      }

      const data = await response.json()
      
      return {
        id: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        payment_method: data.payment_methods?.[0] || 'unknown',
        invoice_url: data.invoice_url,
        transaction_id: data.external_id,
        created_at: data.created,
      }
    } catch (error) {
      console.error('Xendit status check error:', error)
      throw new Error('Failed to check payment status')
    }
  }

  // Create QRIS payment specifically
  async createQRISPayment(paymentData: Omit<XenditPaymentRequest, 'payment_method'>): Promise<XenditPaymentResponse> {
    const qrisPaymentData: XenditPaymentRequest = {
      ...paymentData,
      payment_method: 'qris'
    }
    return this.createPayment(qrisPaymentData)
  }

  // Get QRIS QR code URL
  async getQRISQRCode(invoiceId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get QRIS QR code')
      }

      const data = await response.json()
      
      // QRIS QR code is usually available in the invoice response
      return data.qr_code_url || data.qr_code || null
    } catch (error) {
      console.error('Get QRIS QR code error:', error)
      return null
    }
  }
}

// Create singleton instance
export const xenditAPI = new XenditAPI() 