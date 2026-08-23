import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET course enrollments for the authenticated user */
export async function GET(request: NextRequest) {
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
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('[MOBILE ENROLLMENTS]', error)
      return NextResponse.json({ error: 'Gagal memuat pendaftaran kursus' }, { status: 500 })
    }

    return NextResponse.json({ enrollments: data || [] })
  } catch (error) {
    console.error('[MOBILE ENROLLMENTS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pendaftaran kursus' }, { status: 500 })
  }
}
