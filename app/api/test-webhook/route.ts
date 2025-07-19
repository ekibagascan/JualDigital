import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendDownloadEmail } from '@/lib/email-service'

export async function POST(req: NextRequest) {
  try {
    const { orderId, testEmail } = await req.json()
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log('[TEST WEBHOOK] Testing webhook for order:', orderId)
    console.log('[TEST WEBHOOK] Test email:', testEmail)

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Update order status to paid
    console.log('[TEST WEBHOOK] Updating order status to paid...')
    await orderService.updateOrderStatus(orderId, 'paid', 'test-payment-id')

    console.log('[TEST WEBHOOK] Order status updated successfully')

    // Fetch order and order items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, user_id, guest_email, status')
      .eq('id', orderId)
      .single()
    
    console.log('[TEST WEBHOOK] Order data:', order)
    console.log('[TEST WEBHOOK] Order error:', orderError)
    
    if (!orderError && order) {
      console.log('[TEST WEBHOOK] Order found, processing email...')
      
      // Use test email if provided, otherwise try to get user email
      let emailToSend = testEmail
      
      if (!emailToSend && order.user_id) {
        console.log('[TEST WEBHOOK] Fetching user email...')
        
        // Fetch user email from auth.users table (Supabase stores emails here)
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(order.user_id)
        
        console.log('[TEST WEBHOOK] User data:', user)
        console.log('[TEST WEBHOOK] User error:', userError)
        
        if (!userError && user && user.user && user.user.email) {
          emailToSend = user.user.email
        }
      }
      
      if (emailToSend) {
        console.log('[TEST WEBHOOK] Sending email to:', emailToSend)
        
        // Fetch order items and product download links
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('id, product_id, product_title:product_title, products:product_id(download_link, file_url, title)')
          .eq('order_id', order.id)
        
        console.log('[TEST WEBHOOK] Order items:', items)
        console.log('[TEST WEBHOOK] Items error:', itemsError)
        
        if (!itemsError && items && items.length > 0) {
          console.log('[TEST WEBHOOK] Preparing to send email...')
          
          // Compose download links
          const downloadLinks = items.map(item => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            let link = ''
            if (product?.download_link) {
              link = product.download_link
            } else if (product?.file_url) {
              link = `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${item.id}`
            }
            return `<li><b>${product?.title || item.product_title}</b>: <a href="${link}">${link}</a></li>`
          }).join('')
          
          const html = `<p>Terima kasih telah membeli produk digital di Jual Digital.</p><ul>${downloadLinks}</ul><p>Jika Anda mengalami masalah, silakan hubungi support kami.</p>`
          const text = `Terima kasih telah membeli produk digital di Jual Digital. Link download:\n${items.map(item => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            return `${product?.title || item.product_title}: ${product?.download_link || product?.file_url ? process.env.NEXT_PUBLIC_APP_URL + '/api/download/' + item.id : ''}`
          }).join('\n')}`
          
          console.log('[TEST WEBHOOK] Email subject:', `Link Download Pesanan #${order.order_number}`)
          
          const emailResult = await sendDownloadEmail({
            to: emailToSend,
            subject: `Link Download Pesanan #${order.order_number}`,
            text,
            html,
          })
          
          console.log('[TEST WEBHOOK] Email send result:', emailResult)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Webhook processed successfully',
            emailSent: emailResult,
            emailTo: emailToSend
          })
        } else {
          console.log('[TEST WEBHOOK] No order items found or error:', itemsError)
          return NextResponse.json({ 
            success: false, 
            message: 'No order items found',
            error: itemsError
          })
        }
      } else {
        console.log('[TEST WEBHOOK] No email address found')
        return NextResponse.json({ 
          success: false, 
          message: 'No email address found for order'
        })
      }
    } else {
      console.log('[TEST WEBHOOK] Order not found or error:', orderError)
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found',
        error: orderError
      })
    }

  } catch (error) {
    console.error('[TEST WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ 
      error: 'Failed to process webhook' 
    }, { status: 500 })
  }
} 