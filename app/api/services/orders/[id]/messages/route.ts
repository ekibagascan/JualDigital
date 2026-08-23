import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

async function assertParticipant(supabase: ReturnType<typeof serviceRoleClient>, orderId: string, userId: string) {
  const { data: order, error } = await supabase
    .from('service_orders')
    .select('id, buyer_id, seller_id')
    .eq('id', orderId)
    .single()

  if (error || !order) return { order: null, forbidden: false as const }
  if (order.buyer_id !== userId && order.seller_id !== userId) {
    return { order: null, forbidden: true as const }
  }
  return { order, forbidden: false as const }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const supabase = serviceRoleClient()
    const { order, forbidden } = await assertParticipant(supabase, params.id, user.id)
    if (forbidden) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke percakapan ini' }, { status: 403 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('service_messages')
      .select('*')
      .eq('service_order_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Gagal memuat pesan' }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    console.error('[SERVICES MESSAGES GET] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesan' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const body = await request.json()
    const text = (body.body || body.message || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const { order, forbidden } = await assertParticipant(supabase, params.id, user.id)
    if (forbidden) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke percakapan ini' }, { status: 403 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('service_messages')
      .insert({
        service_order_id: params.id,
        sender_id: user.id,
        body: text,
      })
      .select()
      .single()

    if (error) {
      console.error('[SERVICES MESSAGES POST]', error)
      return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan terkirim',
      data,
    })
  } catch (error) {
    console.error('[SERVICES MESSAGES POST] Error:', error)
    return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 })
  }
}
