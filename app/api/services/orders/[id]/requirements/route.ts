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
    const answers = body.answers ?? body

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Jawaban brief wajib diisi' }, { status: 400 })
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
      return NextResponse.json({ error: 'Hanya pembeli yang dapat mengirim brief' }, { status: 403 })
    }

    if (!['awaiting_requirements', 'revision'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Brief hanya dapat dikirim saat menunggu persyaratan atau revisi' },
        { status: 400 }
      )
    }

    const { data: requirement, error: reqError } = await supabase
      .from('service_requirements')
      .insert({
        service_order_id: params.id,
        answers,
      })
      .select()
      .single()

    if (reqError) {
      console.error('[SERVICES REQUIREMENTS]', reqError)
      return NextResponse.json({ error: 'Gagal menyimpan brief' }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'in_progress',
        requirements_submitted_at: now,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[SERVICES REQUIREMENTS] status', updateError)
      return NextResponse.json({ error: 'Gagal memperbarui status pesanan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Brief berhasil dikirim. Pesanan sedang dikerjakan.',
      requirement,
      order: updated,
    })
  } catch (error) {
    console.error('[SERVICES REQUIREMENTS] Error:', error)
    return NextResponse.json({ error: 'Gagal mengirim brief' }, { status: 500 })
  }
}
