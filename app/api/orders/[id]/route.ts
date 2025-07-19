import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use service role key to bypass RLS policies
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)
    const orderId = params.id

    console.log('[API] Fetching order:', orderId)
    
    const order = await orderService.getOrder(orderId)
    const items = await orderService.getOrderItems(orderId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    console.log('[API] Order found:', order.id, 'Status:', order.status)
    console.log('[API] Order items count:', items.length)

    return NextResponse.json({ 
      order,
      items
    })
  } catch (error) {
    console.error('[API] Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
} 