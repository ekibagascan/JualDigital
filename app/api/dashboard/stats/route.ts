import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  console.log('[DASHBOARD API] ===== API CALLED =====')
  console.log('[DASHBOARD API] All headers:', Object.fromEntries(request.headers.entries()))
  console.log('[DASHBOARD API] URL:', request.url)
  console.log('[DASHBOARD API] Search params:', request.nextUrl.searchParams.toString())
  
  try {
    console.log('[DASHBOARD API] Starting request')
    
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    console.log('[DASHBOARD API] User ID from headers:', userId)
    
    if (!userId) {
      console.log('[DASHBOARD API] No user ID in headers')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    
    console.log('[DASHBOARD API] Supabase client created')
    console.log('[DASHBOARD API] Fetching stats for user:', userId)

    // Get user stats - orders for this specific user
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('user_id', userId)
      .eq('status', 'paid')

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 })
    }

    console.log('[DASHBOARD API] Orders for user', userId, ':', orders)
    const totalPurchases = orders?.length || 0
    const totalSpent = orders?.reduce((sum: number, order: { total_amount: number }) => sum + order.total_amount, 0) || 0
    console.log('[DASHBOARD API] Total purchases:', totalPurchases, 'Total spent:', totalSpent)

    // Get wishlist items for this specific user
    const { data: wishlistItems, error: wishlistError } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)

    if (wishlistError) {
      console.error('Error fetching wishlist:', wishlistError)
    }

    const wishlistCount = wishlistItems?.length || 0
    console.log('[DASHBOARD API] Wishlist items for user', userId, ':', wishlistItems)
    console.log('[DASHBOARD API] Wishlist count:', wishlistCount)

    // Get downloaded items for this specific user
    const { data: downloads, error: downloadsError } = await supabase
      .from('downloads')
      .select('id')
      .eq('user_id', userId)

    if (downloadsError) {
      console.error('Error fetching downloads:', downloadsError)
    }

    const downloadedCount = downloads?.length || 0

    const userStats = {
      totalPurchases,
      totalSpent,
      wishlistItems: wishlistCount,
      downloadedItems: downloadedCount,
    }

    // Get seller stats for this specific user
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price')
      .eq('seller_id', userId)
      .eq('status', 'active')

    if (productsError) {
      console.error('Error fetching products:', productsError)
    }

    const totalProducts = products?.length || 0

    // Get total sales and earnings from order_items for this specific seller
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('price, quantity, seller_earnings, orders!inner(status)')
      .eq('seller_id', userId)
      .eq('orders.status', 'paid')

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError)
    }

    const totalSales = orderItems?.length || 0
    const totalEarnings = orderItems?.reduce((sum: number, item: { seller_earnings: number }) => sum + (item.seller_earnings || 0), 0) || 0

    // Get pending withdrawals for this specific seller
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('seller_id', userId)
      .in('status', ['pending', 'approved'])

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError)
    }

    const pendingWithdrawal = withdrawals?.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0) || 0

    const sellerStats = {
      totalProducts,
      totalSales,
      totalEarnings,
      pendingWithdrawal,
    }

    // Get recent purchases for this specific user
    const { data: recentOrderItems, error: recentError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_title,
        price,
        created_at,
        seller_id,
        products:product_id (
          title,
          image_url
        ),
        orders!inner(
          user_id,
          status,
          created_at
        )
      `)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'paid')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('Error fetching recent purchases:', recentError)
    }

    // Get seller information for recent purchases
    const sellerIds = recentOrderItems?.map(item => item.seller_id) || []
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, name, business_name')
      .in('id', sellerIds)

    type RecentOrderItem = {
      id: string;
      product_title: string;
      price: number;
      seller_id: string;
      created_at: string;
      products: { image_url?: string } | { image_url?: string }[];
      orders: { created_at: string } | { created_at: string }[];
    };
    type Seller = { id: string; name?: string; business_name?: string };

    const recentPurchases = recentOrderItems?.map((item: RecentOrderItem) => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const seller = (sellers as Seller[] | undefined)?.find((s) => s.id === item.seller_id)

      return {
        id: item.id,
        title: item.product_title,
        author: seller?.business_name || seller?.name || 'Jual Digital',
        price: item.price,
        date: new Date(order.created_at).toLocaleDateString('id-ID'),
        status: 'completed',
        image_url: product?.image_url,
      }
    }) || []

    // Get recent products for this specific seller
    const { data: recentProducts, error: productsRecentError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        price,
        total_sales
      `)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    if (productsRecentError) {
      console.error('Error fetching recent products:', productsRecentError)
    }

    const recentProductsList = recentProducts?.map((product: { id: string, title: string, price: number, total_sales?: number }) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      sales: product.total_sales || 0,
      earnings: 0, // Calculate earnings from order_items if needed
      status: 'active',
    })) || []

    const result = {
      success: true,
      timestamp: Date.now(),
      userStats,
      sellerStats,
      recentPurchases,
      recentProducts: recentProductsList,
    }
    
    console.log('[DASHBOARD API] Final result for user', userId, ':', result)
    
    // Return response with cache control headers to prevent caching
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
    console.error('[DASHBOARD API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 