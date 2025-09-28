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
    console.log('[WEBHOOK] Received webhook from Xendit:', body)
    console.log('[WEBHOOK] Full webhook payload:', JSON.stringify(body, null, 2))

    // Extract payment information from webhook
    const { 
      external_id, 
      status, 
      payment_id,
      invoice_id,
      amount,
      paid_amount,
      paid_at,
      payment_channel,
      payment_method
    } = body

    if (!external_id) {
      console.error('[WEBHOOK] Missing external_id in webhook payload')
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 })
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Map Xendit status to our order status
    let orderStatus = 'pending'
    if (status === 'PAID') {
      orderStatus = 'paid'
    } else if (status === 'EXPIRED') {
      orderStatus = 'expired'
    } else if (status === 'FAILED') {
      orderStatus = 'failed'
    }

    console.log('[WEBHOOK] Updating order status:', {
      orderId: external_id,
      status: orderStatus,
      paymentId: payment_id || invoice_id,
      amount,
      paidAmount: paid_amount,
      paidAt: paid_at,
      paymentChannel: payment_channel,
      paymentMethod: payment_method
    })

    console.log('[WEBHOOK] About to update order with ID:', external_id)
    console.log('[WEBHOOK] Order status to set:', orderStatus)

    // Update order status in database
    await orderService.updateOrderStatus(
      external_id, 
      orderStatus, 
      payment_id || invoice_id
    )

    console.log('[WEBHOOK] Order status updated successfully')

    // After updating order status, if paid and user_id exists, send download email
    if (orderStatus === 'paid') {
      console.log('[WEBHOOK] Order is paid, checking if user email should be sent...')
      
      // Fetch order and order items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, guest_email, status, note')
        .eq('id', external_id)
        .single()
      
      console.log('[WEBHOOK] Order data:', order)
      console.log('[WEBHOOK] Order error:', orderError)
      
      if (!orderError && order && order.user_id) {
        console.log('[WEBHOOK] Order has user_id, fetching user email...')
        
        // Fetch user email from auth.users table (Supabase stores emails here)
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(order.user_id)
        
        console.log('[WEBHOOK] User data:', user)
        console.log('[WEBHOOK] User error:', userError)
        
        if (!userError && user && user.user && user.user.email) {
          console.log('[WEBHOOK] User email found:', user.user.email)
          
          // Fetch order items and product download links
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('id, product_id, product_title:product_title, products:product_id(download_link, file_url, title)')
            .eq('order_id', order.id)
          
          console.log('[WEBHOOK] Order items:', items)
          console.log('[WEBHOOK] Items error:', itemsError)
          
          if (!itemsError && items && items.length > 0) {
            console.log('[WEBHOOK] Preparing to send email...')
            
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
            
            console.log('[WEBHOOK] Sending email to:', user.user.email)
            console.log('[WEBHOOK] Email subject:', `Link Download Pesanan #${order.order_number}`)
            
            const emailResult = await sendDownloadEmail({
              to: user.user.email,
              subject: `Link Download Pesanan #${order.order_number}`,
              text,
              html,
            })
            
            console.log('[WEBHOOK] Email send result:', emailResult)
          } else {
            console.log('[WEBHOOK] No order items found or error:', itemsError)
          }
        } else {
          console.log('[WEBHOOK] No user email found or error:', userError)
        }
      } else {
        console.log('[WEBHOOK] Order has no user_id (guest order) or error:', orderError)
      }

      // Send WhatsApp notifications to sellers when payment is successful
      console.log('[WEBHOOK] Sending WhatsApp notifications to sellers...')
      const whatsappService = new WhatsAppService()
      
      // Fetch order items with seller information
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_id, seller_id, product_title, price, quantity')
        .eq('order_id', external_id)
      
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
            } catch (error) {
              console.log('[WEBHOOK] Could not fetch buyer name:', error)
            }
          }

          await whatsappService.sendOrderNotification(sellerId, {
            orderNumber: order?.order_number || external_id,
            productTitle: productTitles,
            amount: totalAmount,
            buyerName,
            quantity: totalQuantity,
            note: order?.note,
            paymentStatus: 'paid'
          })
        }
        
        console.log('[WEBHOOK] WhatsApp notifications sent to sellers')
      } else {
        console.log('[WEBHOOK] No order items found for WhatsApp notifications:', itemsError)
      }
    } else {
      console.log('[WEBHOOK] Order is not paid, skipping email and WhatsApp notifications')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order status updated' 
    })

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ 
      error: 'Failed to process webhook' 
    }, { status: 500 })
  }
}
 