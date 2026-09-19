import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET signed media URL for a lesson within an enrollment */
export async function GET(
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
      .select('id, product_id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!enrollment) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 })
    }

    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .select('id, title, content_type, video_path, file_path, body, section_id')
      .eq('id', params.lessonId)
      .maybeSingle()

    if (error || !lesson) {
      return NextResponse.json({ error: 'Pelajaran tidak ditemukan' }, { status: 404 })
    }

    if (lesson.content_type === 'text') {
      return NextResponse.json({
        content_type: 'text',
        body: lesson.body,
        title: lesson.title,
        url: '',
      })
    }

    const path = (lesson.video_path || lesson.file_path) as string | null
    if (!path) {
      return NextResponse.json({ error: 'Media tidak tersedia' }, { status: 404 })
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return NextResponse.json({ content_type: lesson.content_type, url: path, title: lesson.title })
    }

    let filePath = path
    if (filePath.startsWith('products/')) filePath = filePath.replace('products/', '')
    if (filePath.includes('/storage/v1/object/public/products/')) {
      filePath = filePath.split('/storage/v1/object/public/products/')[1]
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('products')
      .createSignedUrl(filePath, 3600)

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Gagal membuat URL media' }, { status: 500 })
    }

    return NextResponse.json({
      content_type: lesson.content_type,
      url: signed.signedUrl,
      title: lesson.title,
      expires_in: 3600,
    })
  } catch (error) {
    console.error('[MOBILE LESSON MEDIA] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat media' }, { status: 500 })
  }
}
