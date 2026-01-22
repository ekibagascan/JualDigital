import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest, { params }: { params: { orderItemId: string } }) {
  try {
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
      console.error('[DOWNLOAD API] Order item not found:', params.orderItemId, 'Error:', orderItemError)
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    console.log('[DOWNLOAD API] Order item found:', params.orderItemId)
    console.log('[DOWNLOAD API] Order status:', orderItem.orders?.status)

    // Check if order is paid (normalize status for comparison)
    const orderStatus = orderItem.orders?.status?.toLowerCase().trim()
    if (orderStatus !== 'paid') {
      console.error('[DOWNLOAD API] Order not paid. Status:', orderItem.orders?.status, 'Normalized:', orderStatus)
      return NextResponse.json({ 
        error: 'Order not paid', 
        details: `Order status is "${orderItem.orders?.status}" (normalized: "${orderStatus}")` 
      }, { status: 403 })
    }

    // Check if user is owner (user_id or guest_email)
    // (You may want to add more robust auth here)
    // For now, allow if order is paid

    // Serve download_link or file_url
    const product = orderItem.products
    if (!product) {
      console.error('[DOWNLOAD API] Product not found for order item:', params.orderItemId)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log('[DOWNLOAD API] Product found:', product.id, 'Has download_link:', !!product.download_link, 'Has file_url:', !!product.file_url)

    if (product.download_link) {
      // External download link - redirect to it
      console.log('[DOWNLOAD API] Redirecting to external download link:', product.download_link)
      return NextResponse.redirect(product.download_link)
    } else if (product.file_url) {
      // Generate signed URL for Supabase Storage
      console.log('[DOWNLOAD API] Generating signed URL for file:', product.file_url)
      
      // Extract file path from file_url (remove bucket prefix if present)
      let filePath = product.file_url
      if (filePath.startsWith('products/')) {
        filePath = filePath.replace('products/', '')
      }
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('products')
        .createSignedUrl(filePath, 60 * 10) // 10 min
      
      if (signedUrlError || !signedUrlData) {
        console.error('[DOWNLOAD API] Failed to generate signed URL:', signedUrlError)
        console.error('[DOWNLOAD API] File path used:', filePath)
        return NextResponse.json({ 
          error: 'Failed to generate download link',
          details: signedUrlError?.message 
        }, { status: 500 })
      }
      
      console.log('[DOWNLOAD API] Signed URL generated, redirecting')
      return NextResponse.redirect(signedUrlData.signedUrl)
    } else {
      console.error('[DOWNLOAD API] No download link or file_url available for product:', product.id)
      return NextResponse.json({ 
        error: 'No download available for this product',
        details: 'Product has no download_link or file_url'
      }, { status: 404 })
    }
  } catch (error) {
    console.error('[DOWNLOAD API] Error:', error)
    return NextResponse.json({ error: 'Failed to process download' }, { status: 500 })
  }
} 