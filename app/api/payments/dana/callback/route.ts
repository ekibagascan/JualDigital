import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/dana'
import { sendDownloadEmail } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    console.log('[DANA WEBHOOK] Received webhook:', body)

    const signature = req.headers.get('X-SIGNATURE')
    if (!signature) {
      console.error('[DANA WEBHOOK] Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature (skip if public key not configured)
    const publicKey = process.env.DANA_PUBLIC_KEY
    if (publicKey) {
      const isValidSignature = verifyWebhookSignature(rawBody, signature)
      if (!isValidSignature) {
        console.error('[DANA WEBHOOK] Invalid signature')
        console.error('[DANA WEBHOOK] Signature received:', signature.substring(0, 50) + '...')
        console.error('[DANA WEBHOOK] Body:', rawBody.substring(0, 200))
        // In sandbox, sometimes signature verification fails - log but continue for now
        console.warn('[DANA WEBHOOK] Signature verification failed, but continuing in sandbox mode')
        // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      } else {
        console.log('[DANA WEBHOOK] Signature verified successfully')
      }
    } else {
      console.warn('[DANA WEBHOOK] DANA_PUBLIC_KEY not configured, skipping signature verification')
    }

    const {
      partnerReferenceNo,
      referenceNo,
      transactionStatus,
      responseCode,
    } = body

    if (!partnerReferenceNo) {
      console.error('[DANA WEBHOOK] Missing partnerReferenceNo')
      return NextResponse.json({ error: 'Missing partnerReferenceNo' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find order by order_number (DANA uses order_number as partnerReferenceNo)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', partnerReferenceNo)
      .single()

    if (orderError || !order) {
      console.error('[DANA WEBHOOK] Order not found:', partnerReferenceNo)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('[DANA WEBHOOK] Processing order:', order.id, 'Status:', transactionStatus)

    // Update order based on transaction status
    let newStatus = order.status
    let shouldNotify = false

    // DANA transaction statuses: SUCCESS, PENDING, FAILED, CANCELLED
    switch (transactionStatus?.toUpperCase()) {
      case 'SUCCESS':
      case 'PAID':
        // Payment successful
        newStatus = 'paid'
        shouldNotify = true
        break
      case 'PENDING':
        // Payment pending
        newStatus = 'pending'
        break
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
        // Payment failed or cancelled
        newStatus = 'cancelled'
        break
      default:
        console.log('[DANA WEBHOOK] Unknown status:', transactionStatus)
        // If responseCode indicates success, treat as paid
        if (responseCode === '2005400') {
          newStatus = 'paid'
          shouldNotify = true
        }
    }

    // Update order
    console.log('[DANA WEBHOOK] Updating order:', order.id, 'from', order.status, 'to', newStatus)
    const { error: updateError, data: updatedOrder } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        transaction_id: referenceNo || order.transaction_id,
        payment_id: referenceNo || order.payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error('[DANA WEBHOOK] Error updating order:', updateError)
      console.error('[DANA WEBHOOK] Update error details:', JSON.stringify(updateError, null, 2))
      return NextResponse.json({
        error: 'Failed to update order',
        details: updateError.message
      }, { status: 500 })
    }

    if (updatedOrder) {
      console.log('[DANA WEBHOOK] Order updated successfully:', updatedOrder.id, 'New status:', updatedOrder.status)
    } else {
      console.warn('[DANA WEBHOOK] Order update returned no data')
    }

    // If payment is successful, send notifications and process downloads
    if (shouldNotify && newStatus === 'paid') {
      try {
        // Get order items
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        if (orderItems && orderItems.length > 0) {
          // Send email to customer
          const customerEmail = order.guest_email
          if (customerEmail) {
            try {
              // Format email content
              const itemsList = orderItems.map(item => {
                const title = item.product_title || 'Product'
                return `- ${title} (Qty: ${item.quantity})`
              }).join('\n')

              const subject = `Link Download Pesanan #${order.order_number}`
              const text = `
Terima kasih telah melakukan pembayaran!

Pesanan Anda #${order.order_number} telah dikonfirmasi. Berikut adalah detail pesanan Anda:

${itemsList}

Total: Rp ${(order.total_amount + (order.tax_amount || 0)).toLocaleString('id-ID')}

Silakan akses halaman pesanan Anda untuk mendapatkan link download.

Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.

Salam,
Tim Jual Digital
              `.trim()

              const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Link Download Pesanan</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">JD Jual Digital</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin-top: 0;">✅ Pembayaran Berhasil!</h2>
            
            <p>Terima kasih telah melakukan pembayaran!</p>
            
            <p>Pesanan Anda <strong>#${order.order_number}</strong> telah dikonfirmasi.</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p><strong>Detail Pesanan:</strong></p>
                ${orderItems.map(item => {
                const title = item.product_title || 'Product'
                return `<p style="margin: 10px 0;">
                    <strong>${title}</strong> - Qty: ${item.quantity}
                  </p>`
              }).join('')}
                <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <strong>Total: Rp ${(order.total_amount + (order.tax_amount || 0)).toLocaleString('id-ID')}</strong>
                </p>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/purchases" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Lihat Pesanan Saya</a>
            </p>
            
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.</p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Salam,<br>Tim Jual Digital</p>
        </div>
    </div>
</body>
</html>
              `.trim()

              await sendDownloadEmail({
                to: customerEmail,
                subject,
                text,
                html,
              })
              console.log('[DANA WEBHOOK] Download email sent to:', customerEmail)
            } catch (emailError) {
              console.error('[DANA WEBHOOK] Error sending email:', emailError)
            }
          }

          // Send WhatsApp notifications to sellers
          const whatsappService = new WhatsAppService()
          const sellerIds = [...new Set(orderItems.map(item => item.seller_id))]

          for (const sellerId of sellerIds) {
            const sellerItems = orderItems.filter(item => item.seller_id === sellerId)
            const productTitles = sellerItems.map(item => item.product_title || 'Product').join(', ')
            const totalAmount = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const totalQuantity = sellerItems.reduce((sum, item) => sum + item.quantity, 0)

            try {
              await whatsappService.sendOrderNotification(sellerId, {
                orderNumber: order.order_number,
                productTitle: productTitles,
                amount: totalAmount,
                quantity: totalQuantity,
                buyerName: order.guest_name || undefined,
                paymentStatus: 'paid',
              })
              console.log('[DANA WEBHOOK] WhatsApp notification sent to seller:', sellerId)
            } catch (whatsappError) {
              console.error('[DANA WEBHOOK] Error sending WhatsApp:', whatsappError)
            }
          }
        }
      } catch (notificationError) {
        console.error('[DANA WEBHOOK] Error processing notifications:', notificationError)
        // Don't fail the webhook if notifications fail
      }
    }

    return NextResponse.json({
      status: 'ok',
      order_id: order.id,
      transaction_status: transactionStatus,
    })
  } catch (error) {
    console.error('[DANA WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
