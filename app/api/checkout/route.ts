import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Create Supabase client with cookies to get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    // Get authenticated user from session (server-side verification)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[CHECKOUT] Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      sessionError 
    })

    const orderData = await req.json()
    console.log('[CHECKOUT] Received order data:', { 
      client_user_id: orderData.user_id,
      has_guest_email: !!orderData.guest_email,
      has_guest_name: !!orderData.guest_name
    })

    // If user is authenticated, use their user_id from session (not from client)
    // This ensures logged-in users always have user_id set, even if client sends undefined
    if (session?.user?.id) {
      orderData.user_id = session.user.id
      // Clear guest fields if user is logged in
      orderData.guest_email = null
      orderData.guest_name = null
      console.log('[CHECKOUT] User authenticated, using user_id from session:', session.user.id)
    } else {
      // No session - this is a guest order
      // Only allow guest orders if guest_email is provided
      if (!orderData.guest_email && !orderData.user_id) {
        console.warn('[CHECKOUT] No session and no guest_email provided')
        return NextResponse.json({ error: 'Authentication required or guest email must be provided' }, { status: 401 })
      }
      console.log('[CHECKOUT] Guest order, using guest_email:', orderData.guest_email)
    }

    // Use service role key for order creation to bypass RLS
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    const orderService = new OrderService(serviceSupabase as unknown as SupabaseClient)
    
    console.log('[CHECKOUT] Creating order with:', {
      user_id: orderData.user_id,
      guest_email: orderData.guest_email,
      guest_name: orderData.guest_name,
      items_count: orderData.items?.length
    })
    
    const { order, paymentUrl } = await orderService.createOrder(orderData)
    
    console.log('[CHECKOUT] Order created successfully:', {
      order_id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      guest_email: order.guest_email,
      status: order.status
    })
    console.log('[CHECKOUT] Payment URL:', paymentUrl)
    
    return NextResponse.json({ order, paymentUrl })
  } catch (error: unknown) {
    console.error('[CHECKOUT] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
