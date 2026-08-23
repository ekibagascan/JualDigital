import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const body = await request.json()
    const { enrollment_id, lesson_id, position_sec, completed } = body

    if (!enrollment_id || !lesson_id) {
      return NextResponse.json(
        { error: 'enrollment_id dan lesson_id wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = serviceRoleClient()

    const { data: enrollment, error: enrError } = await supabase
      .from('course_enrollments')
      .select('id, user_id')
      .eq('id', enrollment_id)
      .single()

    if (enrError || !enrollment) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
    }

    if (enrollment.user_id !== user.id) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke pendaftaran ini' }, { status: 403 })
    }

    const payload: Record<string, unknown> = {
      enrollment_id,
      lesson_id,
      position_sec: typeof position_sec === 'number' ? position_sec : 0,
      updated_at: new Date().toISOString(),
    }
    if (completed) {
      payload.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'enrollment_id,lesson_id' })
      .select()
      .single()

    if (error) {
      console.error('[COURSE PROGRESS]', error)
      return NextResponse.json({ error: 'Gagal menyimpan progres' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: completed ? 'Pelajaran ditandai selesai' : 'Progres disimpan',
      progress: data,
    })
  } catch (error) {
    console.error('[COURSE PROGRESS] Error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan progres' }, { status: 500 })
  }
}
