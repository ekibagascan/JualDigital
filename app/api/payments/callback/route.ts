import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendDownloadEmail } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Xendit webhooks can have different structures:
    // 1. Event-based: { event: "invoice.paid", data: { ... } }
    // 2. Direct invoice data: { external_id, status, ... }
    let invoiceData = body
    
    // If webhook has 'event' field, extract data from 'data' field or use body directly
    if (body.event) {
      // Xendit sends invoice data in 'data' field for event-based webhooks
      invoiceData = body.data || body
    }

    // Extract payment information from webhook
    const { 
      external_id, 
      status, 
      payment_id,
      invoice_id,
      id // Xendit invoice ID
    } = invoiceData

    // Use invoice_id or id if external_id is not available
    const orderId = external_id || id
    const paymentId = payment_id || invoice_id || id

    if (!orderId) {
      console.error('[WEBHOOK] Missing external_id or id in webhook payload')
      return NextResponse.json({ error: 'Missing external_id or id' }, { status: 400 })
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Determine status from event or status field
    let orderStatus = 'pending'
    
    // Check event type first (more reliable)
    if (body.event) {
      if (body.event === 'invoice.paid' || body.event === 'invoices.paid') {
        orderStatus = 'paid'
      } else if (body.event === 'invoice.expired' || body.event === 'invoices.expired') {
        orderStatus = 'expired'
      } else if (body.event === 'invoice.failed' || body.event === 'invoices.failed') {
        orderStatus = 'failed'
      }
    }
    
    // Fallback to status field if event didn't set it
    if (orderStatus === 'pending' && status) {
      if (status === 'PAID' || status === 'paid') {
        orderStatus = 'paid'
      } else if (status === 'EXPIRED' || status === 'expired') {
        orderStatus = 'expired'
      } else if (status === 'FAILED' || status === 'failed') {
        orderStatus = 'failed'
      }
    }

    // First, verify the order exists
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (checkError || !existingOrder) {
      console.error('[WEBHOOK] Order not found:', orderId)
      // Return 200 to prevent Xendit from retrying for non-existent orders
      return NextResponse.json({ 
        success: false,
        error: 'Order not found',
        orderId 
      }, { status: 200 })
    }

    // Update order status in database
    await orderService.updateOrderStatus(
      orderId, 
      orderStatus, 
      paymentId
    )

    // After updating order status, if paid and user_id exists, send download email
    if (orderStatus === 'paid') {
      // Fetch order and order items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, guest_email, status, note')
        .eq('id', orderId)
        .single()
      
      if (!orderError && order && order.user_id) {
        // Fetch user email from auth.users table (Supabase stores emails here)
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(order.user_id)
        
        if (!userError && user && user.user && user.user.email) {
          // Fetch order items and product download links
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('id, product_id, product_title:product_title, products:product_id(download_link, file_url, title)')
            .eq('order_id', order.id)
          
          if (!itemsError && items && items.length > 0) {
            
            // Compose download links with styled buttons
            const downloadButtons = items.map(item => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products
              let link = ''
              if (product?.download_link) {
                link = product.download_link
              } else if (product?.file_url) {
                link = `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${item.id}`
              }
              
              return `
                <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">${product?.title || item.product_title}</h3>
                  <a href="${link}" class="download-btn" style="
                    display: inline-block;
                    background: black;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    border: 2px solid #e5e7eb;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  ">📥 Download Produk</a>
                </div>
              `
            }).join('')
            
            const html = `
              <!DOCTYPE html>
              <html>
              <head>
                  <meta charset="utf-8">
                  <title>Link Download Pesanan</title>
                  <style>
                    @media (prefers-color-scheme: dark) {
                      .download-btn {
                        background: white !important;
                        color: black !important;
                      }
                    }
                    @media (prefers-color-scheme: light) {
                      .download-btn {
                        background: black !important;
                        color: white !important;
                      }
                    }
                  </style>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                          <div style="display: inline-flex; align-items: center; gap: 12px;">
                              <div style="
                                background: #1f2937;
                                color: white;
                                padding: 8px 12px;
                                border-radius: 6px;
                                font-weight: bold;
                                font-size: 16px;
                                letter-spacing: 0.5px;
                              ">JD</div>
                              <span style="
                                font-weight: bold;
                                font-size: 20px;
                                color: #1f2937;
                              ">Jual Digital</span>
                          </div>
                      </div>
                      
                      <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                          <h2 style="color: #059669; margin-top: 0;">✅ Pembayaran Berhasil!</h2>
                          
                          <p>Terima kasih telah membeli produk digital di Jual Digital.</p>
                          <p><strong>Order #${order.order_number}</strong></p>
                          
                          <div style="margin: 30px 0;">
                              <h3 style="color: #1f2937; margin-bottom: 20px;">Link Download Produk:</h3>
                              ${downloadButtons}
                          </div>
                          
                          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                              Jika Anda mengalami masalah, silakan hubungi support kami.
                          </p>
                      </div>
                      
                      <div style="text-align: center; color: #6b7280; font-size: 12px;">
                          <p>© 2025 Jual Digital. Semua hak dilindungi.</p>
                      </div>
                  </div>
              </body>
              </html>
            `
            const text = `Terima kasih telah membeli produk digital di Jual Digital. Link download:\n${items.map(item => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products
              return `${product?.title || item.product_title}: ${product?.download_link || product?.file_url ? process.env.NEXT_PUBLIC_APP_URL + '/api/download/' + item.id : ''}`
            }).join('\n')}`
            
            await sendDownloadEmail({
              to: user.user.email,
              subject: `Link Download Pesanan #${order.order_number}`,
              text,
              html,
            })
          }
        }
      }

      // Send WhatsApp notifications to sellers when payment is successful
      const whatsappService = new WhatsAppService()
      
      // Fetch order items with seller information
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_id, seller_id, product_title, price, quantity')
        .eq('order_id', orderId)
      
      if (!itemsError && orderItems && orderItems.length > 0) {
        // Group items by seller
        const sellerGroups = new Map<string, typeof orderItems>()
        
        for (const item of orderItems) {
          if (!sellerGroups.has(item.seller_id)) {
            sellerGroups.set(item.seller_id, [])
          }
          sellerGroups.get(item.seller_id)!.push(item)
        }

        // Send notification to each seller
        for (const [sellerId, items] of sellerGroups) {
          const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const productTitles = items.map(item => item.product_title).join(', ')
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

          // Get buyer name if available
          let buyerName: string | undefined
          if (order?.user_id) {
            try {
              const { data: user } = await supabase.auth.admin.getUserById(order.user_id)
              buyerName = user?.user?.user_metadata?.name || user?.user?.email
            } catch {
              // Silently fail buyer name fetch
            }
          }

          await whatsappService.sendOrderNotification(sellerId, {
            orderNumber: order?.order_number || orderId,
            productTitle: productTitles,
            amount: totalAmount,
            buyerName,
            quantity: totalQuantity,
            note: order?.note,
            paymentStatus: 'paid'
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order status updated' 
    })

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error instanceof Error ? error.message : 'Unknown error')
    
    // Determine if error is retryable
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isRetryable = errorMessage.includes('database') || 
                       errorMessage.includes('connection') || 
                       errorMessage.includes('timeout') ||
                       errorMessage.includes('network')
    
    // Return 500 for retryable errors (database, network issues)
    // Return 200 for non-retryable errors (business logic, validation)
    const statusCode = isRetryable ? 500 : 200
    
    return NextResponse.json({ 
      error: 'Failed to process webhook',
      message: errorMessage,
      retryable: isRetryable
    }, { status: statusCode })
  }
}
 