import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTransactionStatus, verifyWebhookSignature } from '@/lib/midtrans'
import { sendDownloadEmail } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[MIDTRANS WEBHOOK] Received webhook:', body)

    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
      transaction_id,
      payment_type,
      fraud_status,
    } = body

    if (!order_id) {
      console.error('[MIDTRANS WEBHOOK] Missing order_id')
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    )

    if (!isValidSignature) {
      console.error('[MIDTRANS WEBHOOK] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find order by order_number (Midtrans uses order_number as order_id)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', order_id)
      .single()

    if (orderError || !order) {
      console.error('[MIDTRANS WEBHOOK] Order not found:', order_id)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('[MIDTRANS WEBHOOK] Processing order:', order.id, 'Status:', transaction_status)

    // Update order based on transaction status
    let newStatus = order.status
    let shouldNotify = false

    switch (transaction_status) {
      case 'settlement':
      case 'capture':
        // Payment successful
        newStatus = 'paid'
        shouldNotify = true
        break
      case 'pending':
        // Payment pending (e.g., bank transfer pending)
        newStatus = 'pending'
        break
      case 'deny':
      case 'expire':
      case 'cancel':
        // Payment failed or cancelled
        newStatus = 'cancelled'
        break
      default:
        console.log('[MIDTRANS WEBHOOK] Unknown status:', transaction_status)
    }

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        transaction_id: transaction_id || order.transaction_id,
        payment_id: transaction_id || order.payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('[MIDTRANS WEBHOOK] Error updating order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
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
          const customerEmail = order.guest_email || order.user_id
          if (customerEmail) {
            try {
              await sendDownloadEmail({
                orderId: order.id,
                orderNumber: order.order_number,
                customerEmail: customerEmail,
                customerName: order.guest_name || 'Customer',
                items: orderItems.map(item => ({
                  title: item.product_title,
                  quantity: item.quantity,
                  price: item.price,
                })),
                totalAmount: order.total_amount,
              })
              console.log('[MIDTRANS WEBHOOK] Download email sent to:', customerEmail)
            } catch (emailError) {
              console.error('[MIDTRANS WEBHOOK] Error sending email:', emailError)
            }
          }

          // Send WhatsApp notifications to sellers
          const whatsappService = new WhatsAppService()
          const sellerIds = [...new Set(orderItems.map(item => item.seller_id))]
          
          for (const sellerId of sellerIds) {
            const sellerItems = orderItems.filter(item => item.seller_id === sellerId)
            try {
              await whatsappService.sendOrderNotification({
                sellerId,
                orderId: order.id,
                orderNumber: order.order_number,
                items: sellerItems.map(item => ({
                  title: item.product_title,
                  quantity: item.quantity,
                  price: item.price,
                })),
                totalAmount: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
              })
              console.log('[MIDTRANS WEBHOOK] WhatsApp notification sent to seller:', sellerId)
            } catch (whatsappError) {
              console.error('[MIDTRANS WEBHOOK] Error sending WhatsApp:', whatsappError)
            }
          }
        }
      } catch (notificationError) {
        console.error('[MIDTRANS WEBHOOK] Error processing notifications:', notificationError)
        // Don't fail the webhook if notifications fail
      }
    }

    return NextResponse.json({ 
      status: 'ok',
      order_id: order.id,
      transaction_status,
    })
  } catch (error) {
    console.error('[MIDTRANS WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
