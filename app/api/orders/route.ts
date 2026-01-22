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

    // First, let's check how many orders exist for this user (without joins for speed)
    const { data: orderCount, error: countError } = await supabase
      .from('orders')
      .select('id, status', { count: 'exact' })
      .eq('user_id', userId)

    console.log('[ORDERS API] Total orders count for user:', orderCount?.length, 'Count error:', countError)
    if (orderCount && orderCount.length > 0) {
      const statusCount = orderCount.reduce((acc: Record<string, number>, o: { status?: string }) => {
        const s = o.status || 'undefined'
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
      console.log('[ORDERS API] Status count from simple query:', statusCount)
    }

    // Also check if there are paid orders with this user_id but different status format
    const { data: paidOrdersCheck, error: paidCheckError } = await supabase
      .from('orders')
      .select('id, order_number, status, user_id')
      .eq('user_id', userId)
      .ilike('status', '%paid%') // Case-insensitive search for "paid"

    console.log('[ORDERS API] Paid orders check (ilike):', paidOrdersCheck?.length, 'Error:', paidCheckError)
    if (paidOrdersCheck && paidOrdersCheck.length > 0) {
      console.log('[ORDERS API] Found paid orders:', paidOrdersCheck.map((o: { order_number?: string; status?: string }) => ({
        order_number: o.order_number,
        status: o.status
      })))
    }

    // Fetch orders with order items
    // Use service role key to bypass RLS and ensure we get all orders
    // IMPORTANT: Don't filter by status - get ALL orders for this user
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
    // No limit - get all orders

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
      console.log('[ORDERS API] Total orders fetched:', orders.length)
      console.log('[ORDERS API] Status breakdown:', statusBreakdown)
      const paidOrders = orders.filter((o: { status?: string }) => {
        const s = o.status?.toLowerCase().trim()
        return s === 'paid'
      })
      console.log('[ORDERS API] Paid orders count:', paidOrders.length)
      if (paidOrders.length > 0) {
        console.log('[ORDERS API] Paid order numbers:', paidOrders.map((o: { order_number?: string; status?: string }) => o.order_number))
      }
      console.log('[ORDERS API] All order statuses:', orders.map((o: { order_number?: string; status?: string }) => ({
        order_number: o.order_number,
        status: o.status,
        normalized: o.status?.toLowerCase().trim()
      })))
    } else {
      console.log('[ORDERS API] No orders found for user:', userId)
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
