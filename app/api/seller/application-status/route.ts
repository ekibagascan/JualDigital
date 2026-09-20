import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, mapSellerStatusForMobile, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = serviceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      status: mapSellerStatusForMobile(profile) || 'none',
    })
  } catch (error) {
    console.error('[SELLER APPLICATION STATUS] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
