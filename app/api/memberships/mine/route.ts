import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
  }
  const supabase = serviceRoleClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, products:product_id(id, title, image_url), membership_tiers:tier_id(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ subscriptions: [], error: error.message })
  }
  return NextResponse.json({ subscriptions: data || [] })
}
