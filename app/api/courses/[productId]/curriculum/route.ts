import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = serviceRoleClient()
    const productId = params.productId

    let enrolled = false
    if (user) {
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()
      enrolled = !!enrollment
    }

    // Also allow seller to see full curriculum
    let isSeller = false
    if (user) {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .maybeSingle()
      isSeller = product?.seller_id === user.id
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
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[COURSE CURRICULUM]', error)
      return NextResponse.json({ error: 'Gagal memuat kurikulum' }, { status: 500 })
    }

    const showFull = enrolled || isSeller

    const sanitized = (sections || []).map((section) => {
      const lessons = ((section.course_lessons as Array<Record<string, unknown>>) || [])
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map((lesson) => {
          if (showFull || lesson.is_preview) {
            return lesson
          }
          return {
            id: lesson.id,
            title: lesson.title,
            content_type: lesson.content_type,
            duration_sec: lesson.duration_sec,
            is_preview: lesson.is_preview,
            sort_order: lesson.sort_order,
            locked: true,
          }
        })
      return {
        id: section.id,
        title: section.title,
        sort_order: section.sort_order,
        lessons,
      }
    })

    return NextResponse.json({
      enrolled,
      is_seller: isSeller,
      sections: sanitized,
    })
  } catch (error) {
    console.error('[COURSE CURRICULUM] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat kurikulum' }, { status: 500 })
  }
}
