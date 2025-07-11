// Xendit v2 Payment Channel Codes
export const PAYMENT_METHODS = {
  E_WALLET: {
    ASTRAPAY: 'ASTRAPAY',
    SHOPEEPAY: 'SHOPEEPAY',
  },
  RETAIL_OUTLET: {
    ALFAMART: 'ALFAMART',
    INDOMARET: 'INDOMARET',
    AKULAKU: 'AKULAKU',
  },
  VIRTUAL_ACCOUNT: {
    BJB: 'BJB_VIRTUAL_ACCOUNT',
    BNI: 'BNI_VIRTUAL_ACCOUNT',
    BRI: 'BRI_VIRTUAL_ACCOUNT',
    BSI: 'BSI_VIRTUAL_ACCOUNT',
    CIMB: 'CIMB_VIRTUAL_ACCOUNT',
    MANDIRI: 'MANDIRI_VIRTUAL_ACCOUNT',
    PERMATA: 'PERMATA_VIRTUAL_ACCOUNT',
  },
  QRIS: 'QRIS',
}

// Payment method display names and icons
export const PAYMENT_METHOD_DISPLAY = {
  ASTRAPAY: { name: 'AstraPay', icon: '🏦', category: 'E-Wallet' },
  SHOPEEPAY: { name: 'ShopeePay', icon: '🛒', category: 'E-Wallet' },
  ALFAMART: { name: 'Alfamart', icon: '🏪', category: 'Retail Outlet' },
  INDOMARET: { name: 'Indomaret', icon: '🏪', category: 'Retail Outlet' },
  AKULAKU: { name: 'Akulaku', icon: '💳', category: 'Retail Outlet' },
  BJB_VIRTUAL_ACCOUNT: { name: 'BJB Virtual Account', icon: '🏦', category: 'Virtual Account' },
  BNI_VIRTUAL_ACCOUNT: { name: 'BNI Virtual Account', icon: '🏦', category: 'Virtual Account' },
  BRI_VIRTUAL_ACCOUNT: { name: 'BRI Virtual Account', icon: '🏦', category: 'Virtual Account' },
  CIMB_VIRTUAL_ACCOUNT: { name: 'CIMB Virtual Account', icon: '🏦', category: 'Virtual Account' },
  MANDIRI_VIRTUAL_ACCOUNT: { name: 'Mandiri Virtual Account', icon: '🏦', category: 'Virtual Account' },
  PERMATA_VIRTUAL_ACCOUNT: { name: 'Permata Virtual Account', icon: '🏦', category: 'Virtual Account' },
  QRIS: { name: 'QRIS', icon: '📱', category: 'QRIS' },
}

// Xendit API Integration using direct HTTP calls
export interface XenditPaymentRequest {
  external_id: string
  amount: number
  payment_method: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  callback_url: string
  redirect_url: string
  description?: string
}

export interface XenditPaymentResponse {
  id: string
  external_id: string
  amount: number
  status: string
  checkout_url?: string
  qr_code_url?: string
  payment_code?: string
  account_number?: string
  created: string
  [key: string]: any
}

// Helper function for base64 encoding
function btoa(str: string): string {
  if (typeof window !== 'undefined') {
    return window.btoa(str)
  }
  // Fallback for server-side - use a simple base64 implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i)
  }
  
  let byteNum
  let chunk
  let i = 0
  while (i < bytes.length) {
    byteNum = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    chunk = [
      chars[(byteNum >> 18) & 63],
      chars[(byteNum >> 12) & 63],
      chars[(byteNum >> 6) & 63],
      chars[byteNum & 63]
    ]
    output += chunk.join('')
    i += 3
  }
  
  return output
}

export class XenditAPI {
  private baseUrl: string
  private secretKey: string

  constructor() {
    this.baseUrl = 'https://api.xendit.co'
    this.secretKey = (typeof process !== 'undefined' && process.env) ? process.env.XENDIT_SECRET_KEY || '' : ''
    console.log('[XenditAPI] Secret Key:', this.secretKey ? this.secretKey.slice(0, 6) + '...' : '(empty)', '| Is server:', typeof window === 'undefined')
  }

  // Create QRIS payment using /qr_codes endpoint
  async createQRISPayment(paymentData: {
    external_id: string
    amount: number
    callback_url: string
    redirect_url: string
  }): Promise<XenditPaymentResponse> {
    try {
      const requestBody = {
        external_id: paymentData.external_id,
        amount: paymentData.amount,
        type: 'DYNAMIC',
        callback_url: paymentData.callback_url,
      }

      console.log('[XENDIT QRIS DEBUG] Request to Xendit:', requestBody)

      const response = await fetch(`${this.baseUrl}/qr_codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[XENDIT QRIS ERROR] Response status:', response.status)
        console.error('[XENDIT QRIS ERROR] Error data:', errorData)
        throw new Error(errorData.message || errorData.error_code || 'QRIS payment creation failed')
      }

      const data = await response.json()
      return {
        id: data.id,
        external_id: data.external_id,
        amount: data.amount,
        status: data.status,
        qr_code_url: data.qr_string,
        created: data.created,
      }
    } catch (error) {
      console.error('Xendit QRIS payment error:', error)
      throw new Error('QRIS payment processing failed')
    }
  }

  // Create e-wallet payment using /ewallets endpoint
  async createEwalletPayment(paymentData: {
    external_id: string
    amount: number
    ewallet_type: 'SHOPEEPAY' | 'ASTRAPAY'
    phone?: string
    callback_url: string
    redirect_url: string
  }): Promise<XenditPaymentResponse> {
    try {
      const requestBody: any = {
        external_id: paymentData.external_id,
        amount: paymentData.amount,
        ewallet_type: paymentData.ewallet_type,
        callback_url: paymentData.callback_url,
        redirect_url: paymentData.redirect_url,
      }

      if (paymentData.phone) {
        requestBody.phone = paymentData.phone
      }

      console.log('[XENDIT E-WALLET DEBUG] Request to Xendit:', requestBody)

      const response = await fetch(`${this.baseUrl}/ewallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[XENDIT E-WALLET ERROR] Response status:', response.status)
        console.error('[XENDIT E-WALLET ERROR] Error data:', errorData)
        throw new Error(errorData.message || errorData.error_code || 'E-wallet payment creation failed')
      }

      const data = await response.json()
      return {
        id: data.id,
        external_id: data.external_id,
        amount: data.amount,
        status: data.status,
        checkout_url: data.checkout_url,
        created: data.created,
      }
    } catch (error) {
      console.error('Xendit e-wallet payment error:', error)
      throw new Error('E-wallet payment processing failed')
    }
  }

  // Create virtual account using /virtual_accounts endpoint
  async createVirtualAccount(paymentData: {
    external_id: string
    bank_code: string
    name: string
    expected_amount: number
    is_closed: boolean
    callback_url: string
    description?: string
  }): Promise<XenditPaymentResponse> {
    try {
      const requestBody = {
        external_id: paymentData.external_id,
        bank_code: paymentData.bank_code,
        name: paymentData.name,
        expected_amount: paymentData.expected_amount,
        is_closed: paymentData.is_closed,
        callback_url: paymentData.callback_url,
        description: paymentData.description || 'Digital Product Purchase',
      }

      console.log('[XENDIT VA DEBUG] Request to Xendit:', requestBody)

      const response = await fetch(`${this.baseUrl}/virtual_accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[XENDIT VA ERROR] Response status:', response.status)
        console.error('[XENDIT VA ERROR] Error data:', errorData)
        throw new Error(errorData.message || errorData.error_code || 'Virtual account creation failed')
      }

      const data = await response.json()
      return {
        id: data.id,
        external_id: data.external_id,
        amount: data.expected_amount,
        status: data.status,
        account_number: data.account_number,
        created: data.created,
      }
    } catch (error) {
      console.error('Xendit virtual account error:', error)
      throw new Error('Virtual account creation failed')
    }
  }

  // Create retail outlet using /fixed_payment_codes endpoint
  async createRetailOutlet(paymentData: {
    external_id: string
    retail_outlet_name: string
    name: string
    expected_amount: number
    callback_url: string
    description?: string
  }): Promise<XenditPaymentResponse> {
    try {
      const requestBody = {
        external_id: paymentData.external_id,
        retail_outlet_name: paymentData.retail_outlet_name,
        name: paymentData.name,
        expected_amount: paymentData.expected_amount,
        callback_url: paymentData.callback_url,
        description: paymentData.description || 'Digital Product Purchase',
      }

      console.log('[XENDIT RETAIL DEBUG] Request to Xendit:', requestBody)

      const response = await fetch(`${this.baseUrl}/fixed_payment_codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[XENDIT RETAIL ERROR] Response status:', response.status)
        console.error('[XENDIT RETAIL ERROR] Error data:', errorData)
        throw new Error(errorData.message || errorData.error_code || 'Retail outlet creation failed')
      }

      const data = await response.json()
      return {
        id: data.id,
        external_id: data.external_id,
        amount: data.expected_amount,
        status: data.status,
        payment_code: data.payment_code,
        created: data.created,
      }
    } catch (error) {
      console.error('Xendit retail outlet error:', error)
      throw new Error('Retail outlet creation failed')
    }
  }

  // Helper method to determine payment type and create appropriate payment
  async createPayment(paymentData: XenditPaymentRequest): Promise<XenditPaymentResponse> {
    const { payment_method } = paymentData

    // QRIS - handled separately from e-wallets
    if (payment_method === 'QRIS') {
      return this.createQRISPayment({
        external_id: paymentData.external_id,
        amount: paymentData.amount,
        callback_url: paymentData.callback_url,
        redirect_url: paymentData.redirect_url,
      })
    }

    // E-wallets
    if (['SHOPEEPAY', 'ASTRAPAY'].includes(payment_method)) {
      return this.createEwalletPayment({
        external_id: paymentData.external_id,
        amount: paymentData.amount,
        ewallet_type: payment_method as 'SHOPEEPAY' | 'ASTRAPAY',
        phone: paymentData.customer_phone,
        callback_url: paymentData.callback_url,
        redirect_url: paymentData.redirect_url,
      })
    }

    // Virtual Accounts
    if (payment_method.endsWith('_VIRTUAL_ACCOUNT')) {
      const bankCode = payment_method.replace('_VIRTUAL_ACCOUNT', '')
      return this.createVirtualAccount({
        external_id: paymentData.external_id,
        bank_code: bankCode,
        name: paymentData.customer_name,
        expected_amount: paymentData.amount,
        is_closed: true,
        callback_url: paymentData.callback_url,
        description: paymentData.description,
      })
    }

    // Retail Outlets
    if (['ALFAMART', 'INDOMARET', 'AKULAKU'].includes(payment_method)) {
      return this.createRetailOutlet({
        external_id: paymentData.external_id,
        retail_outlet_name: payment_method,
        name: paymentData.customer_name,
        expected_amount: paymentData.amount,
        callback_url: paymentData.callback_url,
        description: paymentData.description,
      })
    }

    throw new Error(`Unsupported payment method: ${payment_method}`)
  }

  // Helper method to determine if payment method should use v2 (all methods now)
  shouldUseV2(paymentMethod: string): boolean {
    // All payment methods now use v2
    return true
  }
}

// Create singleton instance
export const xenditAPI = new XenditAPI()  