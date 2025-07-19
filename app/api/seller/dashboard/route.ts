import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a seller
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get seller stats
    const [productsResult, ordersResult] = await Promise.all([
      // Get total products
      supabase
        .from('products')
        .select('id, price, status')
        .eq('seller_id', user.id),

      // Get orders for this seller's products
      supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          orders!inner(
            id,
            total_amount,
            status
          ),
          products!inner(
            seller_id
          )
        `)
        .eq('products.seller_id', user.id)
        .eq('orders.status', 'completed')
    ])

    if (productsResult.error) {
      console.error('Error fetching products:', productsResult.error)
    }

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
    }

    // Calculate stats
    const totalProducts = productsResult.data?.length || 0
    
    // Calculate unique orders and total revenue
    const uniqueOrders = new Set()
    let totalRevenue = 0
    
    if (ordersResult.data) {
      ordersResult.data.forEach((item: any) => {
        uniqueOrders.add(item.orders.id)
        totalRevenue += (item.price * item.quantity) || 0
      })
    }
    
    const totalOrders = uniqueOrders.size

    // Get recent products
    const { data: recentProducts } = await supabase
      .from('products')
      .select('id, title, price, image_url, status, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue,
        totalSales: totalOrders // For now, same as orders
      },
      recentProducts: recentProducts || []
    })

  } catch (error) {
    console.error('Error in seller dashboard API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 