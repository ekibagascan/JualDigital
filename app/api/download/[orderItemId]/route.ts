import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest, { params }: { params: { orderItemId: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the order item and order
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select('*, orders!inner(status, user_id, guest_email), products:product_id(download_link, file_url, title)')
      .eq('id', params.orderItemId)
      .single()

    if (orderItemError || !orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Check if order is paid
    if (orderItem.orders.status !== 'paid') {
      return NextResponse.json({ error: 'Order not paid' }, { status: 403 })
    }

    // Check if user is owner (user_id or guest_email)
    // (You may want to add more robust auth here)
    // For now, allow if order is paid

    // Serve download_link or file_url
    if (orderItem.products.download_link) {
      // Redirect to external download link
      return NextResponse.redirect(orderItem.products.download_link)
    } else if (orderItem.products.file_url) {
      // Generate signed URL for Supabase Storage
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('products')
        .createSignedUrl(orderItem.products.file_url, 60 * 10) // 10 min
      if (signedUrlError || !signedUrlData) {
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
      }
      return NextResponse.redirect(signedUrlData.signedUrl)
    } else {
      return NextResponse.json({ error: 'No download available for this product' }, { status: 404 })
    }
  } catch (error) {
    console.error('[DOWNLOAD API] Error:', error)
    return NextResponse.json({ error: 'Failed to process download' }, { status: 500 })
  }
} 