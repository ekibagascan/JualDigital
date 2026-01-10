import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

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

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[ADMIN DASHBOARD API] Missing environment variables')
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      supabaseUrl,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Service role doesn't need to set cookies
          },
        },
      }
    )

    // Get current date and 30 days ago for comparison
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. Total Users (profiles) - simplified
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('[ADMIN DASHBOARD API] Users query error:', usersError)
    }

    // 2. Total Products - simplified
    const { count: totalProducts, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (productsError) {
      console.error('[ADMIN DASHBOARD API] Products query error:', productsError)
    }

    // 3. Total Revenue and Admin Earnings - only count paid orders
    const { data: revenueData, error: revenueError } = await supabase
      .from('order_items')
      .select(`
        price,
        quantity,
        seller_earnings,
        orders!inner(status)
      `)
      .eq('orders.status', 'paid')

    if (revenueError) {
      console.error('[ADMIN DASHBOARD API] Revenue query error:', revenueError)
    }

    // Calculate total revenue (seller earnings) and admin earnings (3% commission)
    let totalRevenue = 0
    let totalAdminEarnings = 0
    
    revenueData?.forEach((item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0)
      const quantity = item.quantity || 0
      const sellerEarnings = typeof item.seller_earnings === 'string' 
        ? parseFloat(item.seller_earnings) 
        : (item.seller_earnings || 0)
      
      if (!isNaN(price) && !isNaN(quantity) && !isNaN(sellerEarnings)) {
        const itemTotal = price * quantity
        totalRevenue += sellerEarnings
        // Admin earnings = 3% commission = total - seller_earnings (which is 97%)
        totalAdminEarnings += (itemTotal - sellerEarnings)
      }
    })

    // 4. Total Orders - simplified
    const { count: totalOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (ordersError) {
      console.error('[ADMIN DASHBOARD API] Orders query error:', ordersError)
    }

    // 5. Recent Orders (last 5) - get orders first
    const { data: recentOrdersData, error: recentOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentOrdersError) {
      console.error('[ADMIN DASHBOARD API] Recent orders query error:', recentOrdersError)
    }

    // Get user information for recent orders
    const userIds = recentOrdersData?.map(order => order.user_id) || []
    const { data: recentOrderUsers, error: recentOrderUsersError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (recentOrderUsersError) {
      console.error('[ADMIN DASHBOARD API] Recent order users query error:', recentOrderUsersError)
    }

    // Process recent orders with user information
    const recentOrders = recentOrdersData?.map(order => {
      const user = recentOrderUsers?.find(u => u.id === order.user_id)
      return {
        ...order,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'No email'
      }
    }) || []

    // 6. Top Selling Products - only count paid orders
    const { data: topProductItems, error: topProductItemsError } = await supabase
      .from('order_items')
      .select(`
        product_id, 
        quantity, 
        seller_earnings,
        orders!inner(status)
      `)
      .eq('orders.status', 'paid')
      .order('quantity', { ascending: false })
      .limit(5)

    if (topProductItemsError) {
      console.error('[ADMIN DASHBOARD API] Top product items query error:', topProductItemsError)
    }

    // Get product details for top products
    const productIds = topProductItems?.map(item => item.product_id) || []
    const { data: topProducts, error: topProductsError } = await supabase
      .from('products')
      .select('id, title, image_url')
      .in('id', productIds)

    if (topProductsError) {
      console.error('[ADMIN DASHBOARD API] Top products query error:', topProductsError)
    }

    // 7. Users this month vs last month
    const { count: thisMonthUsers, error: thisMonthUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', now.toISOString().split('T')[0])

    if (thisMonthUsersError) {
      console.error('[ADMIN DASHBOARD API] This month users query error:', thisMonthUsersError)
    }

    const { count: lastMonthUsers, error: lastMonthUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString().split('T')[0])
      .lt('created_at', now.toISOString().split('T')[0])

    if (lastMonthUsersError) {
      console.error('[ADMIN DASHBOARD API] Last month users query error:', lastMonthUsersError)
    }

    const usersChange = (lastMonthUsers || 0) > 0 ? (((thisMonthUsers || 0) - (lastMonthUsers || 0)) / (lastMonthUsers || 0)) * 100 : 0

    // 8. Revenue and Admin Earnings this month vs last month - only count paid orders
    const { data: thisMonthRevenue, error: thisMonthError } = await supabase
      .from('order_items')
      .select(`
        price,
        quantity,
        seller_earnings,
        orders!inner(status)
      `)
      .eq('orders.status', 'paid')
      .gte('created_at', now.toISOString().split('T')[0])

    if (thisMonthError) {
      console.error('[ADMIN DASHBOARD API] This month revenue query error:', thisMonthError)
    }

    const { data: lastMonthRevenue, error: lastMonthError } = await supabase
      .from('order_items')
      .select(`
        price,
        quantity,
        seller_earnings,
        orders!inner(status)
      `)
      .eq('orders.status', 'paid')
      .gte('created_at', thirtyDaysAgo.toISOString().split('T')[0])
      .lt('created_at', now.toISOString().split('T')[0])

    if (lastMonthError) {
      console.error('[ADMIN DASHBOARD API] Last month revenue query error:', lastMonthError)
    }

    let thisMonthTotal = 0
    let thisMonthAdminEarnings = 0
    thisMonthRevenue?.forEach((item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0)
      const quantity = item.quantity || 0
      const sellerEarnings = typeof item.seller_earnings === 'string' 
        ? parseFloat(item.seller_earnings) 
        : (item.seller_earnings || 0)
      
      if (!isNaN(price) && !isNaN(quantity) && !isNaN(sellerEarnings)) {
        const itemTotal = price * quantity
        thisMonthTotal += sellerEarnings
        thisMonthAdminEarnings += (itemTotal - sellerEarnings)
      }
    })
    
    let lastMonthTotal = 0
    let lastMonthAdminEarnings = 0
    lastMonthRevenue?.forEach((item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0)
      const quantity = item.quantity || 0
      const sellerEarnings = typeof item.seller_earnings === 'string' 
        ? parseFloat(item.seller_earnings) 
        : (item.seller_earnings || 0)
      
      if (!isNaN(price) && !isNaN(quantity) && !isNaN(sellerEarnings)) {
        const itemTotal = price * quantity
        lastMonthTotal += sellerEarnings
        lastMonthAdminEarnings += (itemTotal - sellerEarnings)
      }
    })

    const revenueChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0
    const adminEarningsChange = lastMonthAdminEarnings > 0 ? ((thisMonthAdminEarnings - lastMonthAdminEarnings) / lastMonthAdminEarnings) * 100 : 0

    // 9. Orders this month vs last month - simplified
    const { count: thisMonthOrders, error: thisMonthOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', now.toISOString().split('T')[0])

    if (thisMonthOrdersError) {
      console.error('[ADMIN DASHBOARD API] This month orders query error:', thisMonthOrdersError)
    }

    const { count: lastMonthOrders, error: lastMonthOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString().split('T')[0])
      .lt('created_at', now.toISOString().split('T')[0])

    if (lastMonthOrdersError) {
      console.error('[ADMIN DASHBOARD API] Last month orders query error:', lastMonthOrdersError)
    }

    const ordersChange = (lastMonthOrders || 0) > 0 ? (((thisMonthOrders || 0) - (lastMonthOrders || 0)) / (lastMonthOrders || 0)) * 100 : 0

    // Process top products data with real product information
    const processedTopProducts = topProductItems?.map(item => {
      const product = topProducts?.find(p => p.id === item.product_id)
      return {
        id: item.product_id,
        name: product?.title || 'Unknown Product',
        image: product?.image_url || '',
        sales: item.quantity || 0,
        revenue: (() => {
          const earnings = typeof item.seller_earnings === 'string' 
            ? parseFloat(item.seller_earnings) 
            : (item.seller_earnings || 0)
          return isNaN(earnings) ? 0 : earnings
        })()
      }
    }) || []

    const responseData = {
      stats: [
        {
          title: "Total Pengguna",
          value: totalUsers?.toString() || "0",
          change: `${usersChange.toFixed(1)}%`,
          changeType: usersChange >= 0 ? "positive" : "negative",
        },
        {
          title: "Total Produk",
          value: totalProducts?.toString() || "0",
          change: "0%",
          changeType: "positive" as const,
        },
        {
          title: "Total Pendapatan Seller",
          value: `Rp ${totalRevenue.toLocaleString()}`,
          change: `${revenueChange.toFixed(1)}%`,
          changeType: revenueChange >= 0 ? "positive" : "negative",
        },
        {
          title: "Total Pendapatan Admin",
          value: `Rp ${totalAdminEarnings.toLocaleString()}`,
          change: `${adminEarningsChange.toFixed(1)}%`,
          changeType: adminEarningsChange >= 0 ? "positive" : "negative",
        },
        {
          title: "Total Pesanan",
          value: totalOrders?.toString() || "0",
          change: `${ordersChange.toFixed(1)}%`,
          changeType: ordersChange >= 0 ? "positive" : "negative",
        },
      ],
      recentOrders: recentOrders || [],
      topProducts: processedTopProducts,
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': Date.now().toString(),
      },
    })
  } catch (error) {
    console.error('[ADMIN DASHBOARD API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 