import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  )
}

async function requireUser(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return {
      user: null as null,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      ),
    }
  }
  return { user, response: null as null }
}

/** GET — list wishlist products for the authenticated user */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireUser(req)
    if (!user) return response

    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('wishlist')
      .select(
        `
        id,
        product_id,
        created_at,
        products:product_id (
          id, title, description, price, original_price, image_url, images,
          category, tags, seller_id, status, product_type, rating,
          total_sales, total_reviews, featured, created_at
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json([])
      }
      console.error('[MOBILE WISHLIST] GET', error)
      return NextResponse.json({ error: 'Gagal memuat wishlist' }, { status: 500 })
    }

    // iOS client decodes a bare Product array
    const products = (data || [])
      .map((row) => {
        const p = row.products
        return Array.isArray(p) ? p[0] : p
      })
      .filter(Boolean)

    return NextResponse.json(products)
  } catch (error) {
    console.error('[MOBILE WISHLIST] GET Error:', error)
    return NextResponse.json({ error: 'Gagal memuat wishlist' }, { status: 500 })
  }
}

/** POST — add product { product_id | productId } */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireUser(req)
    if (!user) return response

    const body = await req.json()
    const productId =
      (typeof body.product_id === 'string' && body.product_id) ||
      (typeof body.productId === 'string' && body.productId) ||
      ''

    if (!productId) {
      return NextResponse.json({ error: 'product_id wajib diisi' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('wishlist')
      .insert({ user_id: user.id, product_id: productId })
      .select('id, product_id, created_at')
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Fitur wishlist belum tersedia', message: 'Tabel wishlist belum tersedia' },
          { status: 501 }
        )
      }
      // Unique violation → already in wishlist
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, message: 'Produk sudah ada di wishlist' })
      }
      console.error('[MOBILE WISHLIST] POST', error)
      return NextResponse.json({ error: 'Gagal menambahkan ke wishlist' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, item: data })
  } catch (error) {
    console.error('[MOBILE WISHLIST] POST Error:', error)
    return NextResponse.json({ error: 'Gagal menambahkan ke wishlist' }, { status: 500 })
  }
}

/** DELETE — remove by ?product_id= or body */
export async function DELETE(req: NextRequest) {
  try {
    const { user, response } = await requireUser(req)
    if (!user) return response

    const { searchParams } = new URL(req.url)
    let productId = searchParams.get('product_id') || searchParams.get('productId') || ''

    if (!productId) {
      try {
        const body = await req.json()
        productId =
          (typeof body.product_id === 'string' && body.product_id) ||
          (typeof body.productId === 'string' && body.productId) ||
          ''
      } catch {
        // no body
      }
    }

    if (!productId) {
      return NextResponse.json({ error: 'product_id wajib diisi' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Fitur wishlist belum tersedia', message: 'Tabel wishlist belum tersedia' },
          { status: 501 }
        )
      }
      console.error('[MOBILE WISHLIST] DELETE', error)
      return NextResponse.json({ error: 'Gagal menghapus dari wishlist' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[MOBILE WISHLIST] DELETE Error:', error)
    return NextResponse.json({ error: 'Gagal menghapus dari wishlist' }, { status: 500 })
  }
}
