import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = serviceRoleClient()

    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .select(
        `
        id,
        title,
        content_type,
        video_path,
        file_path,
        body,
        is_preview,
        section_id,
        course_sections!inner (
          id,
          product_id,
          products:product_id (id, seller_id)
        )
      `
      )
      .eq('id', params.lessonId)
      .single()

    if (error || !lesson) {
      return NextResponse.json({ error: 'Pelajaran tidak ditemukan' }, { status: 404 })
    }

    const section = lesson.course_sections as unknown as {
      product_id: string
      products: { id: string; seller_id: string } | null
    }
    const productId = section.product_id
    const sellerId = section.products?.seller_id

    let allowed = !!lesson.is_preview
    if (user) {
      if (sellerId === user.id) {
        allowed = true
      } else {
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle()
        if (enrollment) allowed = true
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Anda harus terdaftar di kursus ini untuk mengakses media' },
        { status: 403 }
      )
    }

    if (lesson.content_type === 'text') {
      return NextResponse.json({
        content_type: 'text',
        body: lesson.body,
        title: lesson.title,
      })
    }

    const path = (lesson.video_path || lesson.file_path) as string | null
    if (!path) {
      return NextResponse.json({ error: 'Media tidak tersedia' }, { status: 404 })
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return NextResponse.json({
        content_type: lesson.content_type,
        url: path,
        title: lesson.title,
      })
    }

    let filePath = path
    if (filePath.startsWith('products/')) {
      filePath = filePath.replace('products/', '')
    }
    if (filePath.includes('/storage/v1/object/public/products/')) {
      filePath = filePath.split('/storage/v1/object/public/products/')[1]
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('products')
      .createSignedUrl(filePath, 3600)

    if (signError || !signed?.signedUrl) {
      console.error('[COURSE MEDIA] sign', signError)
      return NextResponse.json({ error: 'Gagal membuat URL media' }, { status: 500 })
    }

    return NextResponse.json({
      content_type: lesson.content_type,
      url: signed.signedUrl,
      title: lesson.title,
      expires_in: 3600,
    })
  } catch (error) {
    console.error('[COURSE MEDIA] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat media pelajaran' }, { status: 500 })
  }
}
