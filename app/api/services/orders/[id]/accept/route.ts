import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const supabase = serviceRoleClient()

    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Hanya pembeli yang dapat menerima hasil' }, { status: 403 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Pesanan hanya dapat diterima setelah hasil dikirim' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[SERVICES ACCEPT]', updateError)
      return NextResponse.json({ error: 'Gagal menyelesaikan pesanan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan selesai. Terima kasih telah menerima hasil kerja.',
      order: updated,
    })
  } catch (error) {
    console.error('[SERVICES ACCEPT] Error:', error)
    return NextResponse.json({ error: 'Gagal menerima hasil kerja' }, { status: 500 })
  }
}
