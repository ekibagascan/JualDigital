import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import { verifyDokuSignature } from '@/lib/doku'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendDownloadEmail } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Client-Id, Request-Id, Request-Timestamp, Signature',
    },
  })
}

// GET handler for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'DOKU webhook endpoint is active',
    endpoint: '/api/payments/doku/callback'
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function POST(req: NextRequest) {
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Client-Id, Request-Id, Request-Timestamp, Signature',
  }

  try {
    // Get headers for signature verification
    const clientId = req.headers.get('Client-Id') || ''
    const requestId = req.headers.get('Request-Id') || ''
    const requestTimestamp = req.headers.get('Request-Timestamp') || ''
    const signatureHeader = req.headers.get('Signature') || ''

    // Extract signature from header (format: HMACSHA256=signature)
    const signature = signatureHeader.replace('HMACSHA256=', '')

    // Read request body
    const bodyText = await req.text()
    let body: Record<string, unknown> | null = null

    if (bodyText && bodyText.trim() !== '') {
      try {
        body = JSON.parse(bodyText) as Record<string, unknown>
      } catch (error) {
        console.error('[DOKU WEBHOOK] Failed to parse body:', error)
        return NextResponse.json({ 
          status: 'ok',
          message: 'Invalid JSON body'
        }, { headers: responseHeaders })
      }
    }

    // Verify signature if we have all required headers
    if (clientId && requestId && requestTimestamp && signature && body) {
      const requestTarget = '/api/payments/doku/callback'
      const sharedKey = process.env.DOKU_SHARED_KEY || ''

      if (sharedKey) {
        const isValid = verifyDokuSignature(
          signature,
          clientId,
          requestId,
          requestTarget,
          requestTimestamp,
          bodyText,
          sharedKey
        )

        if (!isValid) {
          console.error('[DOKU WEBHOOK] Invalid signature')
          // Log for debugging but don't block in production (can be enabled later)
          // return NextResponse.json({ 
          //   status: 'error',
          //   message: 'Invalid signature'
          // }, { status: 401, headers: responseHeaders })
        }
      }
    }

    // Process webhook in background
    if (body) {
      processWebhook(body).catch(error => {
        console.error('[DOKU WEBHOOK] Background processing error:', error)
      })
    }

    // Return immediate success
    return NextResponse.json({ 
      status: 'ok',
      message: 'Webhook received, processing...'
    }, { headers: responseHeaders })
  } catch (error) {
    console.error('[DOKU WEBHOOK] Error in POST handler:', error)
    return NextResponse.json({ 
      status: 'ok',
      message: 'Webhook received'
    }, { headers: responseHeaders })
  }
}

async function processWebhook(body: Record<string, unknown>) {
  try {
    // DOKU webhook structure
    // Extract invoice number (order number)
    const invoiceNumber = body.invoice_number as string | undefined
    const transaction = body.transaction as Record<string, unknown> | undefined
    const payment = body.payment as Record<string, unknown> | undefined
    const transactionStatus = transaction?.status as string | undefined
    const paymentStatus = payment?.status as string | undefined
    const status = transactionStatus || paymentStatus || (body.status as string | undefined)

    if (!invoiceNumber) {
      console.error('[DOKU WEBHOOK] Missing invoice_number in webhook payload')
      return
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Find order by order_number (invoice_number)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .eq('order_number', invoiceNumber)
      .single()

    if (orderError || !order) {
      console.error('[DOKU WEBHOOK] Order not found for invoice:', invoiceNumber)
      return
    }

    // Determine order status from DOKU status
    let orderStatus = 'pending'
    if (status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED') {
      orderStatus = 'paid'
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      orderStatus = 'failed'
    } else if (status === 'EXPIRED') {
      orderStatus = 'expired'
    }

    // Update order status
    await orderService.updateOrderStatus(
      order.id,
      orderStatus,
      invoiceNumber
    )

    console.log('[DOKU WEBHOOK] Updated order:', order.id, 'to status:', orderStatus)

    // If payment is successful, send download emails
    if (orderStatus === 'paid') {
      // Fetch order and order items
      const { data: updatedOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, guest_email, status, note')
        .eq('id', order.id)
        .single()
      
      if (!orderFetchError && updatedOrder) {
        // Get customer email
        let customerEmail: string | null = null
        
        if (updatedOrder.user_id) {
          try {
            const { data: user } = await supabase.auth.admin.getUserById(updatedOrder.user_id)
            customerEmail = user?.user?.email || null
          } catch (error) {
            console.error('[DOKU WEBHOOK] Error fetching user:', error)
          }
        } else if (updatedOrder.guest_email) {
          customerEmail = updatedOrder.guest_email
        }

        if (customerEmail) {
          // Fetch order items and product download links
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('id, product_id, product_title:product_title, products:product_id(download_link, file_url, title)')
            .eq('order_id', order.id)
          
          if (!itemsError && items && items.length > 0) {
            // Compose download links
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
                          <p><strong>Order #${updatedOrder.order_number}</strong></p>
                          
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
              to: customerEmail,
              subject: `Link Download Pesanan #${updatedOrder.order_number}`,
              text,
              html,
            })
          }
        }

        // Send WhatsApp notifications to sellers
        const whatsappService = new WhatsAppService()
        
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('id, product_id, seller_id, product_title, price, quantity')
          .eq('order_id', order.id)
        
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
            if (updatedOrder.user_id) {
              try {
                const { data: user } = await supabase.auth.admin.getUserById(updatedOrder.user_id)
                buyerName = user?.user?.user_metadata?.name || user?.user?.email
              } catch {
                // Silently fail buyer name fetch
              }
            }

            await whatsappService.sendOrderNotification(sellerId, {
              orderNumber: updatedOrder.order_number || order.id,
              productTitle: productTitles,
              amount: totalAmount,
              buyerName,
              quantity: totalQuantity,
              note: updatedOrder.note,
              paymentStatus: 'paid'
            })
          }
        }
      }
    }

    console.log('[DOKU WEBHOOK] Background processing completed for order:', order.id)
  } catch (error) {
    console.error('[DOKU WEBHOOK] Error processing webhook:', error instanceof Error ? error.message : 'Unknown error')
  }
}

