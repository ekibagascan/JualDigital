import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

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
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, user_id, guest_email')
      .eq('id', params.id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    const ownsByUser = order.user_id === user.id
    const ownsByEmail =
      !!user.email &&
      !!order.guest_email &&
      order.guest_email.toLowerCase() === user.email.toLowerCase()

    if (!ownsByUser && !ownsByEmail) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke pesanan ini' },
        { status: 403 }
      )
    }

    return NextResponse.json({ status: order.status })
  } catch (error) {
    console.error('[MOBILE ORDER STATUS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat status pesanan' }, { status: 500 })
  }
}
