import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[DASHBOARD API] Fetching stats for user:', userId)

    // Get user stats
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('user_id', userId)
      .eq('status', 'paid')

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 })
    }

    const totalPurchases = orders?.length || 0
    const totalSpent = orders?.reduce((sum: number, order: any) => sum + order.total_amount, 0) || 0

    // Get wishlist items
    const { data: wishlistItems } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)

    const wishlistCount = wishlistItems?.length || 0

    // Get downloaded items
    const { data: downloads } = await supabase
      .from('downloads')
      .select('id')
      .eq('user_id', userId)

    const downloadedCount = downloads?.length || 0

    const userStats = {
      totalPurchases,
      totalSpent,
      wishlistItems: wishlistCount,
      downloadedItems: downloadedCount,
    }

    // Get seller stats
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price')
      .eq('seller_id', userId)
      .eq('status', 'active')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch seller stats' }, { status: 500 })
    }

    const totalProducts = products?.length || 0

    // Get total sales and earnings from order_items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('price, quantity, seller_earnings, orders!inner(status)')
      .eq('seller_id', userId)
      .eq('orders.status', 'paid')

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError)
      return NextResponse.json({ error: 'Failed to fetch seller stats' }, { status: 500 })
    }

    const totalSales = orderItems?.length || 0
    const totalEarnings = orderItems?.reduce((sum: number, item: any) => sum + (item.seller_earnings || 0), 0) || 0

    // Get pending withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('seller_id', userId)
      .in('status', ['pending', 'approved'])

    const pendingWithdrawal = withdrawals?.reduce((sum: number, w: any) => sum + w.amount, 0) || 0

    const sellerStats = {
      totalProducts,
      totalSales,
      totalEarnings,
      pendingWithdrawal,
    }

    // Get recent purchases
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

    const recentPurchases = recentOrderItems?.map((item: any) => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
      const seller = sellers?.find(s => s.id === item.seller_id)

      return {
        id: item.id,
        title: item.product_title,
        author: seller?.business_name || seller?.name || 'Jual Digital',
        price: item.price,
        date: new Date(order.created_at).toLocaleDateString('id-ID'),
        status: 'completed',
        image_url: item.products?.image_url,
      }
    }) || []

    // Get recent products
    const { data: recentProducts, error: productsRecentError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        price,
        total_sales,
        seller_earnings
      `)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    if (productsRecentError) {
      console.error('Error fetching recent products:', productsRecentError)
    }

    const recentProductsList = recentProducts?.map((product: any) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      sales: product.total_sales || 0,
      earnings: product.seller_earnings || 0,
      status: 'active',
    })) || []

    return NextResponse.json({
      success: true,
      userStats,
      sellerStats,
      recentPurchases,
      recentProducts: recentProductsList,
    })
  } catch (error) {
    console.error('[DASHBOARD API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 