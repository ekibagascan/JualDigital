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
   * Send WhatsApp notification to seller about application approval
   */
  async sendSellerApprovalNotification(userId: string, data: {
    sellerName: string
    businessName: string
  }): Promise<boolean> {
    try {
      // Get user's phone number from profiles table
      const { data: userProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile?.phone) {
        console.error('[WHATSAPP] No phone number found for user:', userId)
        return false
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(userProfile.phone)
      
      // Create message
      const message = this.createApprovalMessage(data)

      // Send via WhatsApp API
      const success = await this.sendWhatsAppMessage(formattedPhone, message)
      
      if (success) {
        console.log('[WHATSAPP] Approval notification sent successfully to user:', userId)
        return true
      } else {
        console.error('[WHATSAPP] Failed to send approval notification to user:', userId)
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Error sending approval notification:', error)
      return false
    }
  }

  /**
   * Send WhatsApp notification to seller about application rejection
   */
  async sendSellerRejectionNotification(userId: string, data: {
    sellerName: string
    businessName: string
    reason?: string
  }): Promise<boolean> {
    try {
      // Get user's phone number from profiles table
      const { data: userProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile?.phone) {
        console.error('[WHATSAPP] No phone number found for user:', userId)
        return false
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(userProfile.phone)
      
      // Create message
      const message = this.createRejectionMessage(data)

      // Send via WhatsApp API
      const success = await this.sendWhatsAppMessage(formattedPhone, message)
      
      if (success) {
        console.log('[WHATSAPP] Rejection notification sent successfully to user:', userId)
        return true
      } else {
        console.error('[WHATSAPP] Failed to send rejection notification to user:', userId)
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Error sending rejection notification:', error)
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
    paymentStatus?: string
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
   * Create seller approval notification message
   */
  private createApprovalMessage(data: {
    sellerName: string
    businessName: string
  }): string {
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/seller`
    
    return `🎉 *SELAMAT! Aplikasi Seller Anda DISETUJUI!* 🎉

Halo *${data.sellerName}*,

Kabar baik! Aplikasi seller Anda untuk *${data.businessName}* telah *DISETUJUI* oleh tim Jual Digital! 🚀

✅ *Status Aplikasi: DISETUJUI*
📋 *Nama Bisnis:* ${data.businessName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *YUK, MULAI JUALAN SEKARANG!*

Sekarang saatnya untuk:
1️⃣ *Upload Produk Digital Pertama*
   Mulai dengan produk terbaik Anda!

2️⃣ *Atur Harga & Deskripsi*
   Buat produk menarik untuk pembeli

3️⃣ *Dapatkan Penghasilan*
   Setiap penjualan = penghasilan untuk Anda!

💡 *Tips:* Upload produk berkualitas tinggi dengan deskripsi yang jelas untuk menarik lebih banyak pembeli!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Akses Dashboard Seller Anda:*
${dashboardLink}

Klik link di atas untuk mulai mengelola produk dan melihat penjualan Anda!

💬 *Butuh bantuan?* Tim support kami siap membantu Anda kapan saja.

Selamat bergabung dengan Jual Digital! 
Mari bersama-sama sukses di dunia digital! 🎊✨

_Jual Digital - Platform Jual Beli Digital Terpercaya_`
  }

  /**
   * Create seller rejection notification message
   */
  private createRejectionMessage(data: {
    sellerName: string
    businessName: string
    reason?: string
  }): string {
    const reasonText = data.reason ? `\n\n📝 *Alasan Penolakan:*\n${data.reason}` : ''
    const applicationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/seller/register`
    
    return `📬 *Update Aplikasi Seller*

Halo *${data.sellerName}*,

Kami ingin memberitahu bahwa aplikasi seller Anda untuk *${data.businessName}* tidak dapat disetujui saat ini.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *Detail Aplikasi:*
• Nama: ${data.sellerName}
• Nama Bisnis: ${data.businessName}
• Status: ❌ Tidak disetujui${reasonText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *Apa yang Perlu Dilakukan?*

1️⃣ *Perbaiki Masalah yang Disebutkan*
   ${data.reason ? `Perhatikan alasan di atas dan perbaiki sesuai yang diminta.` : 'Pastikan semua informasi yang Anda berikan lengkap dan akurat.'}

2️⃣ *Pastikan Data Lengkap*
   • Informasi bisnis lengkap dan jelas
   • Nomor rekening bank valid
   • Data pribadi terverifikasi

3️⃣ *Ajukan Ulang Aplikasi*
   Setelah memperbaiki, Anda dapat mengajukan ulang aplikasi seller.

🔗 *Ajukan Ulang:* ${applicationLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 *Butuh Bantuan?*
Jika Anda memiliki pertanyaan atau butuh klarifikasi, silakan hubungi tim support kami. Kami siap membantu Anda!

Kami berharap dapat menyambut Anda sebagai seller di Jual Digital setelah perbaikan dilakukan. 🙏

_Jual Digital - Platform Jual Beli Digital Terpercaya_`
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
    paymentStatus?: string
  }): string {
    const buyerInfo = data.buyerName ? `\nPembeli: ${data.buyerName}` : ''
    const quantityText = data.quantity > 1 ? ` (${data.quantity}x)` : ''
    const noteInfo = data.note ? `\n📝 Catatan: ${data.note}` : ''
    const paymentStatus = data.paymentStatus ? `\n💳 Status Pembayaran: ${data.paymentStatus.toUpperCase()}` : ''
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/seller/orders`
    
    return `🛒 *PESANAN BARU!*

📦 Produk: ${data.productTitle}${quantityText}
💰 Total: Rp${data.amount.toLocaleString('id-ID')}
📋 Order: #${data.orderNumber}${buyerInfo}${noteInfo}${paymentStatus}

📊 *Dashboard Seller:* ${dashboardLink}

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
   * Check Fonnte device connection status
   */
  async checkFonnteDeviceStatus(): Promise<{ connected: boolean; message: string }> {
    if (!process.env.FONNTE_API_KEY) {
      return { connected: false, message: 'Fonnte API key not configured' }
    }

    try {
      // Fonnte status endpoint (if available)
      const response = await fetch('https://api.fonnte.com/device', {
        method: 'GET',
        headers: {
          'Authorization': process.env.FONNTE_API_KEY!,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return { 
          connected: data.status === 'connected' || data.connected === true,
          message: data.message || 'Device status checked'
        }
      }

      // If status endpoint doesn't exist, try sending a test message to check
      // (We'll use a different approach - just return unknown status)
      return { 
        connected: false, 
        message: 'Unable to check device status. Try sending a test message.' 
      }
    } catch (error) {
      console.error('[WHATSAPP] Error checking Fonnte device status:', error)
      return { 
        connected: false, 
        message: 'Error checking device status' 
      }
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
        // Check for specific error types
        const errorReason = responseData.reason || responseData.message || 'Unknown error'
        const isDeviceDisconnected = errorReason.includes('disconnected device') || 
                                     errorReason.includes('device') && errorReason.includes('disconnect')
        
        if (isDeviceDisconnected) {
          console.error('[WHATSAPP] ⚠️ Fonnte device is DISCONNECTED!')
          console.error('[WHATSAPP] ⚠️ Please reconnect your WhatsApp device in Fonnte dashboard')
          console.error('[WHATSAPP] ⚠️ Error details:', {
            reason: errorReason,
            requestid: responseData.requestid,
            status: responseData.status,
            phone: phone
          })
        } else {
          console.error('[WHATSAPP] Fonnte API error:', responseData)
        }
        return false
      }
    } catch (error) {
      console.error('[WHATSAPP] Fonnte error:', error)
      return false
    }
  }
} 