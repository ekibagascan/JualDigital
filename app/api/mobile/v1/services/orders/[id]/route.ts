import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

/** GET single service order for the authenticated buyer/seller */
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
      .from('service_orders')
      .select(
        `
        *,
        service_packages:package_id (*),
        products:product_id (id, title, image_url, description, seller_id)
      `
      )
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      console.error('[MOBILE SERVICE ORDER]', error)
      return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Pesanan jasa tidak ditemukan' }, { status: 404 })
    }
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
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

    const product = order.products as { title?: string; image_url?: string } | null
    const pkg = order.service_packages as { title?: string; id?: string } | null

    const normalized = {
      ...order,
      product_title: product?.title || 'Jasa',
      product_image: product?.image_url || null,
      package_name: pkg?.title || null,
      package_id: order.package_id || pkg?.id || null,
      // Map awaiting_requirements → pending for older clients; keep raw status too
      status: order.status === 'awaiting_requirements' ? 'pending' : order.status,
      raw_status: order.status,
    }

    return NextResponse.json({
      order: normalized,
      requirements: requirements.data || [],
      deliverables: deliverables.data || [],
      messages: messages.data || [],
    })
  } catch (error) {
    console.error('[MOBILE SERVICE ORDER] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat pesanan jasa' }, { status: 500 })
  }
}
