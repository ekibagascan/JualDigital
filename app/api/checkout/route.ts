import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Use service role key to bypass RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orderService = new OrderService(supabase as unknown as SupabaseClient)
    const orderData = await req.json()
    
    console.log('[CHECKOUT] Processing order:', orderData)
    
    const { order, paymentUrl } = await orderService.createOrder(orderData)
    
    console.log('[CHECKOUT] Order created successfully:', order.id)
    console.log('[CHECKOUT] Payment URL:', paymentUrl)
    
    return NextResponse.json({ order, paymentUrl })
  } catch (error: any) {
    console.error('[CHECKOUT] Error:', error)
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 })
  }
}
