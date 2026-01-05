import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { orderId, action } = body

    if (!orderId || !action) {
      return NextResponse.json(
        { error: 'Missing orderId or action' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (action === 'confirm') {
      // Confirm payment - update status to 'paid'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('[CONFIRM PAYMENT] Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to confirm payment' },
          { status: 500 }
        )
      }

      // Update order status using OrderService to trigger fulfillment
      await orderService.updateOrderStatus(orderId, 'paid')

      // Send download emails to customers
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
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        // Get user email
        let customerEmail = order.guest_email
        if (order.user_id && !customerEmail) {
          try {
            const { data: user } = await supabase.auth.admin.getUserById(order.user_id)
            if (user?.user?.email) {
              customerEmail = user.user.email
            }
          } catch (error) {
            console.error('[CONFIRM PAYMENT] Error fetching user email:', error)
          }
        }

        if (customerEmail) {
          // Import email service
          const { sendDownloadEmail } = await import('@/lib/email-service')

          // Build download buttons HTML
          interface OrderItemWithProduct {
            id: string
            product_title: string
            products: {
              download_link?: string
              file_url?: string
            } | Array<{
              download_link?: string
              file_url?: string
            }> | null
          }

          const downloadButtons = orderItems.map((item: OrderItemWithProduct) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            const downloadUrl = product?.download_link || product?.file_url 
              ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/api/download/${item.id}`
              : null
            
            if (!downloadUrl) return ''
            
            return `
              <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937;">${item.product_title}</h4>
                <a href="${downloadUrl}" style="
                  display: inline-block;
                  background: #2563eb;
                  color: white;
                  padding: 10px 20px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                ">Download Produk</a>
              </div>
            `
          }).join('')

          const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Link Download Pesanan</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">Jual Digital</h1>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #059669; margin-top: 0;">✅ Pembayaran Berhasil!</h2>
                        
                        <p>Terima kasih telah membeli produk digital di Jual Digital.</p>
                        <p><strong>Order #${order.order_number}</strong></p>
                        
                        <div style="margin: 30px 0;">
                            <h3 style="color: #1f2937; margin-bottom: 20px;">Link Download Produk:</h3>
                            ${downloadButtons}
                        </div>
                    </div>
                </div>
            </body>
            </html>
          `
          
          const text = `Terima kasih telah membeli produk digital di Jual Digital.\n\nOrder #${order.order_number}\n\nLink download:\n${orderItems.map((item: OrderItemWithProduct) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            const downloadUrl = product?.download_link || product?.file_url 
              ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/api/download/${item.id}`
              : 'Tidak tersedia'
            return `${item.product_title}: ${downloadUrl}`
          }).join('\n')}`

          try {
            await sendDownloadEmail({
              to: customerEmail,
              subject: `Link Download Pesanan #${order.order_number}`,
              text,
              html,
            })
          } catch (error) {
            console.error('[CONFIRM PAYMENT] Error sending download email:', error)
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
      })
    } else if (action === 'reject') {
      // Reject payment - update status to 'failed' or keep as 'pending'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('[REJECT PAYMENT] Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to reject payment' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Payment rejected',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[CONFIRM PAYMENT] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

