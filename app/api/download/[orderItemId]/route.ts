import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderItemId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const guestEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || null

    if (!user && !guestEmail) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login atau email pembeli diperlukan' },
        { status: 401 }
      )
    }

    const supabase = serviceRoleClient()

    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select(
        '*, orders!inner(status, user_id, guest_email), products:product_id(id, download_link, file_url, title, product_type)'
      )
      .eq('id', params.orderItemId)
      .single()

    if (orderItemError || !orderItem) {
      return NextResponse.json({ error: 'Item pesanan tidak ditemukan' }, { status: 404 })
    }

    const order = orderItem.orders
    const orderStatus = order?.status?.toLowerCase().trim()
    if (orderStatus !== 'paid') {
      return NextResponse.json({ error: 'Pesanan belum dibayar' }, { status: 403 })
    }

    const isOwner =
      (user && order.user_id && order.user_id === user.id) ||
      (guestEmail &&
        order.guest_email &&
        order.guest_email.toLowerCase() === guestEmail)

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Anda tidak memiliki akses unduhan ini' },
        { status: 403 }
      )
    }

    const product = orderItem.products
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // Prefer JSON signed URL for mobile clients (?format=json)
    const wantJson =
      request.nextUrl.searchParams.get('format') === 'json' ||
      request.headers.get('accept')?.includes('application/json')

    if (product.download_link) {
      if (wantJson) {
        return NextResponse.json({ url: product.download_link })
      }
      return NextResponse.redirect(product.download_link)
    }

    if (product.file_url) {
      let filePath = product.file_url as string
      if (filePath.startsWith('products/')) {
        filePath = filePath.replace('products/', '')
      }
      if (filePath.includes('/storage/v1/object/public/products/')) {
        filePath = filePath.split('/storage/v1/object/public/products/')[1]
      }
      if (filePath.includes('/storage/v1/object/sign/')) {
        // Already a signed URL path — return as-is if full URL
        if (filePath.startsWith('http')) {
          if (wantJson) return NextResponse.json({ url: filePath })
          return NextResponse.redirect(filePath)
        }
      }

      const { data: signed, error: signError } = await supabase.storage
        .from('products')
        .createSignedUrl(filePath, 300)

      if (!signError && signed?.signedUrl) {
        if (wantJson) {
          return NextResponse.json({ url: signed.signedUrl })
        }
        return NextResponse.redirect(signed.signedUrl)
      }

      // Fallback: stream file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('products')
        .download(filePath)

      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: 'Gagal mengunduh file', details: downloadError?.message },
          { status: 500 }
        )
      }

      const fileName = product.title
        ? `${String(product.title).replace(/[^a-z0-9]/gi, '_')}.${filePath.split('.').pop() || 'zip'}`
        : filePath.split('/').pop() || 'download'

      const arrayBuffer = await fileData.arrayBuffer()
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': fileData.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': arrayBuffer.byteLength.toString(),
        },
      })
    }

    return NextResponse.json({ error: 'Tidak ada unduhan untuk produk ini' }, { status: 404 })
  } catch (error) {
    console.error('[DOWNLOAD API] Error:', error)
    return NextResponse.json({ error: 'Gagal memproses unduhan' }, { status: 500 })
  }
}
