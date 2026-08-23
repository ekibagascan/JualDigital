import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = serviceRoleClient()

    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('product_id', params.productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[MEMBERSHIP TIERS]', error)
      return NextResponse.json({ error: 'Gagal memuat paket keanggotaan' }, { status: 500 })
    }

    return NextResponse.json({ tiers: data || [] })
  } catch (error) {
    console.error('[MEMBERSHIP TIERS] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat paket keanggotaan' }, { status: 500 })
  }
}
