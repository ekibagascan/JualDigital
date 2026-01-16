import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/bci-payment'
import { sendDownloadEmail } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[BCI WEBHOOK] Received webhook:', body)

    const {
      paymentId,
      orderId,
      status,
      transactionHash,
    } = body as {
      paymentId: string
      orderId: string
      status: string
      transactionHash?: string
      amount?: number
      token?: string
    }

    if (!paymentId || !orderId) {
      console.error('[BCI WEBHOOK] Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify webhook signature if provided
    const signature = req.headers.get('x-bci-signature')
    if (signature) {
      const isValid = verifyWebhookSignature(body, signature)
      if (!isValid) {
        console.error('[BCI WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find order by order_number (BCI uses order_number as orderId)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderId)
      .single()

    if (orderError || !order) {
      console.error('[BCI WEBHOOK] Order not found:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('[BCI WEBHOOK] Processing order:', order.id, 'Status:', status)

    // Map BCI status to order status
    let newStatus = order.status
    let shouldNotify = false

    switch (status) {
      case 'completed':
        newStatus = 'paid'
        shouldNotify = true
        break
      case 'failed':
      case 'expired':
        newStatus = 'cancelled'
        break
      case 'pending':
        newStatus = 'pending'
        break
      default:
        console.log('[BCI WEBHOOK] Unknown status:', status)
    }

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        transaction_id: transactionHash || order.transaction_id,
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('[BCI WEBHOOK] Error updating order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // If payment is successful, send notifications and process downloads
    if (shouldNotify && newStatus === 'paid') {
      try {
        // Get order items with product details
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            *,
            products:product_id (
              id,
              title,
              download_link,
              file_url
            )
          `)
          .eq('order_id', order.id)

        if (orderItems && orderItems.length > 0) {
          // Send download email to customer
          const customerEmail = order.guest_email
          if (customerEmail) {
            // Format email content
            const itemsList = orderItems.map(item => {
              const title = item.product_title || item.products?.title || 'Product'
              const downloadLink = item.products?.download_link || item.products?.file_url || '#'
              return `- ${title}: ${downloadLink}`
            }).join('\n')

            const subject = `Link Download Pesanan #${order.order_number}`
            const text = `
Terima kasih telah melakukan pembayaran!

Pesanan Anda #${order.order_number} telah dikonfirmasi. Berikut adalah link download untuk produk yang Anda beli:

${itemsList}

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
            
            <p>Pesanan Anda <strong>#${order.order_number}</strong> telah dikonfirmasi. Berikut adalah link download untuk produk yang Anda beli:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                ${orderItems.map(item => {
                  const title = item.product_title || item.products?.title || 'Product'
                  const downloadLink = item.products?.download_link || item.products?.file_url || '#'
                  return `<p style="margin: 10px 0;">
                    <strong>${title}</strong><br>
                    <a href="${downloadLink}" style="color: #2563eb; text-decoration: none;">Download di sini</a>
                  </p>`
                }).join('')}
            </div>
            
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
          }

          // Send WhatsApp notifications to sellers
          const whatsappService = new WhatsAppService()
          const sellerIds = [...new Set(orderItems.map(item => item.seller_id).filter(Boolean))]

          for (const sellerId of sellerIds) {
            const sellerItems = orderItems.filter(item => item.seller_id === sellerId)
            // Send notification for each item (WhatsApp service expects one item per call)
            for (const item of sellerItems) {
              await whatsappService.sendOrderNotification(sellerId, {
                orderNumber: order.order_number,
                productTitle: item.product_title || item.products?.title || 'Product',
                amount: item.price * item.quantity,
                quantity: item.quantity,
                buyerName: order.guest_name || undefined,
                paymentStatus: 'paid',
              })
            }
          }
        }
      } catch (notifyError) {
        console.error('[BCI WEBHOOK] Error sending notifications:', notifyError)
        // Don't fail the webhook if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: newStatus,
    })
  } catch (error) {
    console.error('[BCI WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
