import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class WhatsAppService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Send direct WhatsApp message (for testing)
   */
  async sendDirectMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      
      // Send via WhatsApp API
      const success = await this.sendWhatsAppMessage(formattedPhone, message)
      
      if (success) {
        console.log('[WHATSAPP] Direct message sent successfully to:', formattedPhone)
        return true
      } else {
        console.error('[WHATSAPP] Failed to send direct message to:', formattedPhone)
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Error sending direct message:', error)
      return false
    }
  }

  /**
   * Send WhatsApp notification to seller about new order
   */
  async sendOrderNotification(sellerId: string, orderData: {
    orderNumber: string
    productTitle: string
    amount: number
    buyerName?: string
    quantity: number
    note?: string
  }): Promise<boolean> {
    try {
      // Get seller's phone number from profiles table
      const { data: sellerProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', sellerId)
        .single()

      if (profileError || !sellerProfile?.phone) {
        console.error('[WHATSAPP] No phone number found for seller:', sellerId)
        return false
      }

      // Format phone number (remove +62 and add 62 if needed)
      const formattedPhone = this.formatPhoneNumber(sellerProfile.phone)
      
      // Create message
      const message = this.createOrderMessage(orderData)

      // Send via WhatsApp API
      const success = await this.sendWhatsAppMessage(formattedPhone, message)
      
      if (success) {
        console.log('[WHATSAPP] Notification sent successfully to seller:', sellerId)
        return true
      } else {
        console.error('[WHATSAPP] Failed to send notification to seller:', sellerId)
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Error sending notification:', error)
      return false
    }
  }

  /**
   * Format phone number for WhatsApp API
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // If starts with 0, replace with 62
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1)
    }
    
    // If doesn't start with 62, add it
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned
    }
    
    return cleaned
  }

  /**
   * Create order notification message
   */
  private createOrderMessage(data: {
    orderNumber: string
    productTitle: string
    amount: number
    buyerName?: string
    quantity: number
    note?: string
  }): string {
    const buyerInfo = data.buyerName ? `\nPembeli: ${data.buyerName}` : ''
    const quantityText = data.quantity > 1 ? ` (${data.quantity}x)` : ''
    const noteInfo = data.note ? `\n📝 Catatan: ${data.note}` : ''
    
    return `🛒 *PESANAN BARU!*

📦 Produk: ${data.productTitle}${quantityText}
💰 Total: Rp${data.amount.toLocaleString('id-ID')}
📋 Order: #${data.orderNumber}${buyerInfo}${noteInfo}

Silakan cek dashboard seller Anda untuk detail lengkap dan proses pesanan.

_Jual Digital - Platform Jual Beli Digital Terpercaya_`
  }

  /**
   * Send WhatsApp message using API
   * You can integrate with various WhatsApp API services here
   */
  private async sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    try {
      // Option 1: Using WhatsApp Business API (if you have access)
      if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
        return await this.sendViaWhatsAppBusinessAPI(phone, message)
      }
      
      // Option 2: Using Twilio WhatsApp API
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return await this.sendViaTwilio(phone, message)
      }
      
      // Option 3: Using WhatsApp Cloud API (Meta)
      if (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        return await this.sendViaWhatsAppCloudAPI(phone, message)
      }
      
      // Option 4: Using a third-party service like Fonnte, WAblas, etc.
      if (process.env.FONNTE_API_KEY) {
        return await this.sendViaFonnte(phone, message)
      }
      
      console.warn('[WHATSAPP] No WhatsApp API configured. Message would be sent to:', phone)
      console.warn('[WHATSAPP] Message:', message)
      
      // For development/testing, just log the message
      return true
    } catch (error) {
      console.error('[WHATSAPP] Error sending message:', error)
      return false
    }
  }

  /**
   * Send via WhatsApp Business API
   */
  private async sendViaWhatsAppBusinessAPI(phone: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(process.env.WHATSAPP_API_URL!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message,
          type: 'text'
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('[WHATSAPP] Business API error:', error)
      return false
    }
  }

  /**
   * Send via Twilio WhatsApp API
   */
  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!
      const authToken = process.env.TWILIO_AUTH_TOKEN!
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM!
      
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:+${phone}`,
          Body: message
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('[WHATSAPP] Twilio error:', error)
      return false
    }
  }

  /**
   * Send via WhatsApp Cloud API (Meta)
   */
  private async sendViaWhatsAppCloudAPI(phone: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message }
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('[WHATSAPP] Cloud API error:', error)
      return false
    }
  }

  /**
   * Send via Fonnte API (Indonesian WhatsApp API service)
   */
  private async sendViaFonnte(phone: string, message: string): Promise<boolean> {
    try {
      console.log('[WHATSAPP] Sending via Fonnte to:', phone)
      console.log('[WHATSAPP] Message:', message)
      
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': process.env.FONNTE_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message: message
        })
      })
      
      const responseData = await response.json()
      console.log('[WHATSAPP] Fonnte response:', responseData)
      
      if (response.ok && responseData.status === true) {
        console.log('[WHATSAPP] Fonnte message sent successfully')
        return true
      } else {
        console.error('[WHATSAPP] Fonnte API error:', responseData)
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Fonnte error:', error)
      return false
    }
  }
} 