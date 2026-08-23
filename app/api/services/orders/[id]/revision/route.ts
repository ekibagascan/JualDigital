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

    const body = await request.json().catch(() => ({}))
    const note = (body.note || body.message || '').trim()

    const supabase = serviceRoleClient()

    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select('*, service_packages:package_id (id, revisions)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Hanya pembeli yang dapat meminta revisi' }, { status: 403 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Revisi hanya dapat diminta setelah hasil dikirim' },
        { status: 400 }
      )
    }

    const pkg = order.service_packages as { revisions?: number } | null
    const maxRevisions = pkg?.revisions ?? 1
    const currentCount = order.revision_count || 0

    if (currentCount >= maxRevisions) {
      return NextResponse.json(
        {
          error: `Kuota revisi sudah habis (${currentCount}/${maxRevisions})`,
        },
        { status: 400 }
      )
    }

    if (note) {
      await supabase.from('service_messages').insert({
        service_order_id: params.id,
        sender_id: user.id,
        body: `[Permintaan revisi] ${note}`,
      })
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'revision',
        revision_count: currentCount + 1,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[SERVICES REVISION]', updateError)
      return NextResponse.json({ error: 'Gagal meminta revisi' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Permintaan revisi dikirim ke penjual.',
      order: updated,
    })
  } catch (error) {
    console.error('[SERVICES REVISION] Error:', error)
    return NextResponse.json({ error: 'Gagal meminta revisi' }, { status: 500 })
  }
}
