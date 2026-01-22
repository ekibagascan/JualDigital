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
      // Fetch file from Supabase Storage and stream it
      console.log('[DOWNLOAD API] Fetching file from storage:', product.file_url)

      // Extract file path from file_url (remove bucket prefix if present)
      let filePath = product.file_url
      if (filePath.startsWith('products/')) {
        filePath = filePath.replace('products/', '')
      }
      
      // Also handle if it's a full URL
      if (filePath.includes('/storage/v1/object/public/products/')) {
        filePath = filePath.split('/storage/v1/object/public/products/')[1]
      }

      console.log('[DOWNLOAD API] File path after processing:', filePath)

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('products')
        .download(filePath)

      if (downloadError || !fileData) {
        console.error('[DOWNLOAD API] Failed to download file:', downloadError)
        console.error('[DOWNLOAD API] File path used:', filePath)
        return NextResponse.json({
          error: 'Failed to download file',
          details: downloadError?.message
        }, { status: 500 })
      }

      // Get file name from product title or file path
      const fileName = product.title 
        ? `${product.title.replace(/[^a-z0-9]/gi, '_')}.${filePath.split('.').pop() || 'zip'}`
        : filePath.split('/').pop() || 'download'

      console.log('[DOWNLOAD API] File downloaded, streaming to client. File name:', fileName)

      // Convert blob to array buffer
      const arrayBuffer = await fileData.arrayBuffer()
      
      // Return file with proper headers to force download
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': fileData.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': arrayBuffer.byteLength.toString(),
        },
      })
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