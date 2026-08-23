import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** Browser-friendly enrollments list (cookie or Bearer). */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
  }
  const supabase = serviceRoleClient()
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*, products:product_id(id, title, image_url)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  if (error) {
    return NextResponse.json({ enrollments: [], error: error.message })
  }
  return NextResponse.json({ enrollments: data || [] })
}
