import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET single course enrollment */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(
        `
        *,
        products:product_id (
          id, title, description, image_url, price, seller_id, product_type, status
        )
      `
      )
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[MOBILE ENROLLMENT]', error)
      return NextResponse.json({ error: 'Gagal memuat pendaftaran' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
    }

    const product = data.products as {
      title?: string
      image_url?: string
    } | null

    return NextResponse.json({
      enrollment: {
        ...data,
        product_id: data.product_id,
        product_title: product?.title || 'Kursus',
        product_image: product?.image_url || null,
        progress_percent: data.progress_percent ?? 0,
      },
    })
  } catch (error) {
    console.error('[MOBILE ENROLLMENT] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pendaftaran' }, { status: 500 })
  }
}
