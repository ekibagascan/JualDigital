import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('[ADMIN ORDERS API] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Get all profiles to map user information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('[ADMIN ORDERS API] Profiles query error:', profilesError)
    }

    // Get order items for each order
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')

    if (orderItemsError) {
      console.error('[ADMIN ORDERS API] Order items query error:', orderItemsError)
    }

    // Get products for order items
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title')

    if (productsError) {
      console.error('[ADMIN ORDERS API] Products query error:', productsError)
    }

    // Calculate stats
    const totalOrders = orders?.length || 0
    const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0
    const paidOrders = orders?.filter(order => order.status === 'paid').length || 0
    const cancelledOrders = orders?.filter(order => order.status === 'cancelled').length || 0
    const totalRevenue = orders?.filter(order => order.status === 'paid').reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0

    // Process order data with additional information
    const processedOrders = orders?.map(order => {
      // Find user information
      const user = profiles?.find(profile => profile.id === order.user_id)
      
      // Get order items for this order
      const orderOrderItems = orderItems?.filter(item => item.order_id === order.id) || []
      
      // Process order items with product information
      const processedItems = orderOrderItems.map(item => {
        const product = products?.find(p => p.id === item.product_id)
        return {
          id: item.id,
          product_id: item.product_id,
          product_title: product?.title || 'Unknown Product',
          quantity: item.quantity || 0,
          price: parseFloat(item.price) || 0,
          seller_earnings: parseFloat(item.seller_earnings) || 0
        }
      })

      return {
        id: order.id,
        order_number: order.order_number,
        total_amount: parseFloat(order.total_amount) || 0,
        status: order.status || 'pending',
        created_at: order.created_at,
        user_id: order.user_id,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'No email',
        items: processedItems
      }
    }) || []

    return NextResponse.json({
      orders: processedOrders,
      stats: {
        totalOrders,
        pendingOrders,
        paidOrders,
        cancelledOrders,
        totalRevenue
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('[ADMIN ORDERS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 