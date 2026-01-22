import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDownloadEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { orderItemId } = await req.json()

    if (!orderItemId) {
      return NextResponse.json({ error: 'Order item ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get order item with order and product details
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select(`
        *,
        orders!inner(
          id,
          order_number,
          status,
          user_id,
          guest_email,
          total_amount,
          tax_amount
        ),
        products:product_id(
          id,
          title,
          download_link,
          file_url
        )
      `)
      .eq('id', orderItemId)
      .single()

    if (orderItemError || !orderItem) {
      console.error('[RESEND DOWNLOAD] Order item not found:', orderItemError)
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    const order = orderItem.orders
    const product = orderItem.products

    // Check if order is paid
    const orderStatus = order?.status?.toLowerCase().trim()
    if (orderStatus !== 'paid') {
      return NextResponse.json({
        error: 'Order not paid',
        details: `Order status is "${order?.status}"`
      }, { status: 403 })
    }

    // Get customer email
    let customerEmail: string | null = null

    if (order?.guest_email) {
      customerEmail = order.guest_email
    } else if (order?.user_id) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(order.user_id)
        if (!userError && userData?.user?.email) {
          customerEmail = userData.user.email
        }
      } catch (userError) {
        console.error('[RESEND DOWNLOAD] Error fetching user email:', userError)
      }
    }

    if (!customerEmail) {
      return NextResponse.json({
        error: 'Customer email not found',
        details: 'Cannot send email without customer email address'
      }, { status: 404 })
    }

    // Prepare download link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const downloadUrl = product?.download_link || product?.file_url
      ? `${baseUrl}/api/download/${orderItemId}`
      : null

    const productTitle = product?.title || orderItem.product_title || 'Product'

    // Prepare email content
    const subject = `Link Download Pesanan #${order.order_number}`
    const text = `
Terima kasih telah melakukan pembayaran!

Pesanan Anda #${order.order_number} telah dikonfirmasi. Berikut adalah link download untuk produk yang Anda beli:

- ${productTitle}: ${downloadUrl || 'Link download akan tersedia di halaman pesanan'}

Total: Rp ${(order.total_amount + (order.tax_amount || 0)).toLocaleString('id-ID')}

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
            <h2 style="color: #059669; margin-top: 0;">✅ Link Download Produk</h2>
            
            <p>Terima kasih telah melakukan pembayaran!</p>
            
            <p>Pesanan Anda <strong>#${order.order_number}</strong> telah dikonfirmasi. Berikut adalah link download untuk produk yang Anda beli:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 10px 0;">
                    <strong>${productTitle}</strong> - Qty: ${orderItem.quantity}<br>
                    ${downloadUrl
        ? `<a href="${downloadUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Download di sini</a>`
        : '<span style="color: #6b7280;">Link download akan tersedia di halaman pesanan</span>'}
                </p>
                <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <strong>Total: Rp ${(order.total_amount + (order.tax_amount || 0)).toLocaleString('id-ID')}</strong>
                </p>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${baseUrl}/purchases" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Lihat Pesanan Saya</a>
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

    // Send email
    const emailSent = await sendDownloadEmail({
      to: customerEmail,
      subject,
      text,
      html,
    })

    if (emailSent) {
      console.log('[RESEND DOWNLOAD] Email sent successfully to:', customerEmail)
      return NextResponse.json({
        success: true,
        message: 'Download link email sent successfully'
      })
    } else {
      console.error('[RESEND DOWNLOAD] Failed to send email')
      return NextResponse.json({
        error: 'Failed to send email',
        details: 'Email service returned false'
      }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('[RESEND DOWNLOAD] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to resend download link'
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}
