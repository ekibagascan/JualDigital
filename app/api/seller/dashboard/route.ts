import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    // Get user ID from headers (set by middleware)
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    // Check if user is a seller
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[SELLER DASHBOARD API] Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get seller stats
    const [productsResult, orderItemsResult] = await Promise.all([
      // Get total products
      supabase
        .from('products')
        .select('id, price, status')
        .eq('seller_id', userId)
        .eq('status', 'active'),

      // Get order items for this seller's products (paid orders only)
      supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          seller_earnings,
          created_at,
          orders!inner(
            id,
            status
          )
        `)
        .eq('seller_id', userId)
        .eq('orders.status', 'paid')
    ])

    if (productsResult.error) {
      console.error('[SELLER DASHBOARD API] Error fetching products:', productsResult.error)
    }

    if (orderItemsResult.error) {
      console.error('[SELLER DASHBOARD API] Error fetching order items:', orderItemsResult.error)
    }

    // Calculate stats
    const totalProducts = productsResult.data?.length || 0
    
    // Calculate unique orders and total revenue
    const uniqueOrders = new Set()
    let totalRevenue = 0
    let totalSales = 0
    
    if (orderItemsResult.data) {
      console.log('[SELLER DASHBOARD API] Total order items fetched:', orderItemsResult.data.length)
      
      orderItemsResult.data.forEach((item: { 
        id: string;
        orders: { id: string; status: string } | { id: string; status: string }[]; 
        price: number | string; 
        quantity: number;
        seller_earnings: number | string;
      }) => {
        // Handle both array and object for orders
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
        // Only count paid orders (double-check even though query filters)
        if (order && order.id && order.status === 'paid') {
          uniqueOrders.add(order.id)
          // Parse seller_earnings as it comes from PostgreSQL as string (numeric type)
          const earnings = typeof item.seller_earnings === 'string' 
            ? parseFloat(item.seller_earnings) 
            : (item.seller_earnings || 0)
          
          if (isNaN(earnings)) {
            console.warn('[SELLER DASHBOARD API] Invalid earnings value for item:', item.id, 'earnings:', item.seller_earnings)
          } else {
            totalRevenue += earnings
        totalSales += item.quantity || 0
          }
        } else {
          console.warn('[SELLER DASHBOARD API] Skipping item with non-paid order:', item.id, 'order status:', order?.status)
        }
      })
      
      console.log('[SELLER DASHBOARD API] Calculated totalRevenue:', totalRevenue, 'totalSales:', totalSales, 'uniqueOrders:', uniqueOrders.size)
    }
    
    const totalOrders = uniqueOrders.size



    // Calculate growth (this month vs last month)
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    let thisMonthRevenue = 0
    let lastMonthRevenue = 0
    
    if (orderItemsResult.data) {
      orderItemsResult.data.forEach((item: { 
        seller_earnings: number | string;
        created_at: string;
        orders: { id: string; status: string } | { id: string; status: string }[];
      }) => {
        // Only count paid orders for revenue calculation
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
        if (order && order.status === 'paid') {
          // Parse seller_earnings as it comes from PostgreSQL as string (numeric type)
          const earnings = typeof item.seller_earnings === 'string' 
            ? parseFloat(item.seller_earnings) 
            : (item.seller_earnings || 0)
        const itemDate = new Date(item.created_at)
        if (itemDate >= thisMonth) {
            thisMonthRevenue += earnings
        } else if (itemDate >= lastMonth && itemDate < thisMonth) {
            lastMonthRevenue += earnings
          }
        }
      })
    }
    
    let growthPercentage = 0
    if (lastMonthRevenue > 0) {
      growthPercentage = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    } else if (thisMonthRevenue > 0) {
      growthPercentage = 100 // If no revenue last month but has this month, it's 100% growth
    }

    // Get recent products
    const { data: recentProducts } = await supabase
      .from('products')
      .select('id, title, price, image_url, status, created_at')
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    const result = {
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue,
        totalSales,
        growthPercentage: Math.round(growthPercentage)
      },
      recentProducts: recentProducts || []
    }



    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': Date.now().toString(),
      },
    })

  } catch (error) {
    console.error('[SELLER DASHBOARD API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} export const dynamic = 'force-dynamic'
