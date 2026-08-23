import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const body = await request.json()
    const { title, body: postBody, media_type, media_path, min_tier_sort_order, is_public_teaser, publish } =
      body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Judul postingan wajib diisi' }, { status: 400 })
    }

    const supabase = serviceRoleClient()

    const { data: product } = await supabase
      .from('products')
      .select('id, seller_id, product_type')
      .eq('id', params.productId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }
    if (product.seller_id !== user.id) {
      return NextResponse.json({ error: 'Hanya penjual yang dapat membuat postingan' }, { status: 403 })
    }

    const { data: post, error } = await supabase
      .from('membership_posts')
      .insert({
        product_id: params.productId,
        author_id: user.id,
        title: title.trim(),
        body: postBody || null,
        media_type: media_type || 'text',
        media_path: media_path || null,
        min_tier_sort_order: min_tier_sort_order ?? 0,
        is_public_teaser: !!is_public_teaser,
        published_at: publish === false ? null : new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[MEMBERSHIP POSTS]', error)
      return NextResponse.json({ error: 'Gagal membuat postingan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Postingan berhasil dibuat',
      post,
    })
  } catch (error) {
    console.error('[MEMBERSHIP POSTS] Error:', error)
    return NextResponse.json({ error: 'Gagal membuat postingan' }, { status: 500 })
  }
}
