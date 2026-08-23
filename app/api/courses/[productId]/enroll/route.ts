import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({
        enrolled: false,
        enrollment: null,
        message: 'Login untuk melihat status pendaftaran',
      })
    }

    const supabase = serviceRoleClient()

    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', params.productId)
      .maybeSingle()

    if (error) {
      console.error('[COURSE ENROLL]', error)
      return NextResponse.json({ error: 'Gagal memeriksa pendaftaran' }, { status: 500 })
    }

    let progress: unknown[] = []
    if (enrollment) {
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollment.id)
      progress = data || []
    }

    return NextResponse.json({
      enrolled: !!enrollment,
      enrollment: enrollment || null,
      progress,
    })
  } catch (error) {
    console.error('[COURSE ENROLL] Error:', error)
    return NextResponse.json({ error: 'Gagal memeriksa pendaftaran' }, { status: 500 })
  }
}
