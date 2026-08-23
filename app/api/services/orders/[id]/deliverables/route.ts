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

    const body = await request.json()
    const { file_url, link_url, note } = body

    if (!file_url && !link_url && !note) {
      return NextResponse.json(
        { error: 'Sertakan file, link, atau catatan hasil kerja' },
        { status: 400 }
      )
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

    if (order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Hanya penjual yang dapat mengunggah hasil' }, { status: 403 })
    }

    if (!['in_progress', 'revision'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Hasil hanya dapat dikirim saat status dikerjakan atau revisi' },
        { status: 400 }
      )
    }

    const { data: deliverable, error: delError } = await supabase
      .from('service_deliverables')
      .insert({
        service_order_id: params.id,
        file_url: file_url || null,
        link_url: link_url || null,
        note: note || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (delError) {
      console.error('[SERVICES DELIVERABLES]', delError)
      return NextResponse.json({ error: 'Gagal menyimpan hasil kerja' }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'delivered',
        delivered_at: now,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[SERVICES DELIVERABLES] status', updateError)
      return NextResponse.json({ error: 'Gagal memperbarui status pesanan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Hasil kerja berhasil dikirim. Menunggu konfirmasi pembeli.',
      deliverable,
      order: updated,
    })
  } catch (error) {
    console.error('[SERVICES DELIVERABLES] Error:', error)
    return NextResponse.json({ error: 'Gagal mengirim hasil kerja' }, { status: 500 })
  }
}
