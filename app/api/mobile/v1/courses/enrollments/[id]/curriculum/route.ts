import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET curriculum for an enrollment (via product_id) */
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
    const { data: enrollment, error: enrErr } = await supabase
      .from('course_enrollments')
      .select('id, product_id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (enrErr || !enrollment) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
    }

    const { data: sections, error } = await supabase
      .from('course_sections')
      .select(
        `
        id,
        title,
        sort_order,
        course_lessons (
          id,
          title,
          content_type,
          video_path,
          body,
          file_path,
          duration_sec,
          is_preview,
          sort_order
        )
      `
      )
      .eq('product_id', enrollment.product_id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[MOBILE CURRICULUM]', error)
      return NextResponse.json({ error: 'Gagal memuat kurikulum' }, { status: 500 })
    }

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('enrollment_id', params.id)

    const completedSet = new Set(
      (progress || []).filter((p) => p.completed_at).map((p) => p.lesson_id)
    )

    const normalized = (sections || []).map((section) => {
      const lessons = ((section.course_lessons as Array<Record<string, unknown>>) || [])
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map((lesson) => ({
          id: lesson.id,
          section_id: section.id,
          title: lesson.title,
          duration_seconds: lesson.duration_sec ?? null,
          video_url: lesson.video_path ?? null,
          media_url: lesson.file_path ?? null,
          completed: completedSet.has(String(lesson.id)),
          sort_order: lesson.sort_order,
        }))
      return {
        id: section.id,
        title: section.title,
        sort_order: section.sort_order,
        lessons,
      }
    })

    return NextResponse.json({ sections: normalized })
  } catch (error) {
    console.error('[MOBILE CURRICULUM] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat kurikulum' }, { status: 500 })
  }
}
