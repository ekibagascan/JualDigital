import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering - this route uses request.url and query parameters
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orderNumber = searchParams.get('order_number')

    // If order_number is provided, fetch by order_number
    if (orderNumber) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_title,
            price,
            quantity,
            created_at,
            seller_id,
            products:product_id (
              title,
              image_url
            )
          )
        `)
        .eq('order_number', orderNumber)
        .single()

      if (error || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      return NextResponse.json({ order })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[ORDERS API] Fetching orders for user:', userId)

    // Fetch orders with order items
    // Use service role key to bypass RLS and ensure we get all orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_title,
          price,
          quantity,
          created_at,
          seller_id,
          products:product_id (
            title,
            image_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Also log raw status values to see exactly what we're getting
    if (orders && orders.length > 0) {
      console.log('[ORDERS API] Raw status values from DB:', orders.map((o: { order_number?: string; status?: string }) => ({
        order_number: o.order_number,
        raw_status: o.status,
        status_repr: JSON.stringify(o.status), // Shows hidden characters
      })))
    }

    console.log('[ORDERS API] Orders query result:', { orders, error })

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Log status breakdown for debugging
    if (orders && orders.length > 0) {
      const statusBreakdown = orders.reduce((acc: Record<string, number>, order: { status?: string }) => {
        const status = order.status || 'undefined'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      console.log('[ORDERS API] Status breakdown:', statusBreakdown)
      console.log('[ORDERS API] Paid orders:', orders.filter((o: { status?: string }) => {
        const s = o.status?.toLowerCase().trim()
        return s === 'paid'
      }).length)
      console.log('[ORDERS API] Sample order statuses:', orders.slice(0, 3).map((o: { order_number?: string; status?: string }) => ({
        order_number: o.order_number,
        status: o.status,
        statusType: typeof o.status,
        statusLength: o.status?.length,
        normalized: o.status?.toLowerCase().trim()
      })))
    }

    return NextResponse.json({
      success: true,
      orders: orders || []
    })
  } catch (error) {
    console.error('[ORDERS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
