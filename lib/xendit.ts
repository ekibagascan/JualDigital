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

// Create Xendit Invoice (hosted checkout page)
export async function createInvoice(invoiceData: {
  external_id: string,
  amount: number,
  payer_email: string,
  description?: string,
  items?: Array<{
    name: string,
    quantity: number,
    price: number,
  }>,
  should_send_email?: boolean,
  success_redirect_url?: string,
  failure_redirect_url?: string,
  currency?: string,
  callback_url?: string,
}) {
  const baseUrl = 'https://api.xendit.co'
  const secretKey = (typeof process !== 'undefined' && process.env) ? process.env.XENDIT_SECRET_KEY || '' : ''
  const payload: Record<string, unknown> = {
    external_id: invoiceData.external_id,
    amount: invoiceData.amount,
    payer_email: invoiceData.payer_email,
    description: invoiceData.description,
    items: invoiceData.items,
    should_send_email: invoiceData.should_send_email ?? false,
    success_redirect_url: invoiceData.success_redirect_url,
    failure_redirect_url: invoiceData.failure_redirect_url,
    currency: invoiceData.currency || 'IDR',
    callback_url: invoiceData.callback_url,
  }
  // Remove undefined fields
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key])

  const response = await fetch(`${baseUrl}/v2/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || errorData.error_code || 'Invoice creation failed')
  }

  return await response.json()
}  

