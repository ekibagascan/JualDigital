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
      return NextResponse.json({ error: 'Unauthorized', message: 'Login diperlukan' }, { status: 401 })
    }

    const supabase = serviceRoleClient()

    const { data: order, error } = await supabase
      .from('service_orders')
      .select(
        `
        *,
        service_packages:package_id (*),
        products:product_id (id, title, image_url, description, seller_id)
      `
      )
      .eq('id', params.id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke pesanan ini' }, { status: 403 })
    }

    const [requirements, deliverables, messages] = await Promise.all([
      supabase
        .from('service_requirements')
        .select('*')
        .eq('service_order_id', params.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('service_deliverables')
        .select('*')
        .eq('service_order_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_messages')
        .select('*')
        .eq('service_order_id', params.id)
        .order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      order,
      requirements: requirements.data || [],
      deliverables: deliverables.data || [],
      messages: messages.data || [],
    })
  } catch (error) {
    console.error('[SERVICES ORDER DETAIL] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat detail pesanan jasa' }, { status: 500 })
  }
}
