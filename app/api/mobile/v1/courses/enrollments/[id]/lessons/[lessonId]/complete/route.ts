import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** POST mark lesson complete */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
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
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!enrollment) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(
        {
          enrollment_id: params.id,
          lesson_id: params.lessonId,
          position_sec: 0,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'enrollment_id,lesson_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[MOBILE LESSON COMPLETE]', error)
      return NextResponse.json({ error: 'Gagal menyimpan progres' }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress: data })
  } catch (error) {
    console.error('[MOBILE LESSON COMPLETE] Error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan progres' }, { status: 500 })
  }
}
