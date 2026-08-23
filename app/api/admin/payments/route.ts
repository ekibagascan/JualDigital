import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-session'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    if (!isAdminRequest(req)) {
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
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Service role doesn't need to set cookies
          },
        },
      }
    )

    // Get all orders with payment information
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('[ADMIN PAYMENTS API] Orders query error:', ordersError)
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
      console.error('[ADMIN PAYMENTS API] Profiles query error:', profilesError)
    }

    // Get all order items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')

    if (orderItemsError) {
      console.error('[ADMIN PAYMENTS API] Order items query error:', orderItemsError)
    }

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, seller_id')

    if (productsError) {
      console.error('[ADMIN PAYMENTS API] Products query error:', productsError)
    }

    // Calculate stats
    const totalTransactions = orders?.length || 0
    const completedTransactions = orders?.filter(order => order.status === 'paid').length || 0
    const pendingTransactions = orders?.filter(order => order.status === 'pending').length || 0
    const failedTransactions = orders?.filter(order => order.status === 'cancelled').length || 0

    // Calculate revenue
    const paidOrders = orders?.filter(order => order.status === 'paid') || []
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)
    
    // Calculate platform fee (3% per transaction)
    const platformRevenue = paidOrders.reduce((sum, order) => {
      const orderAmount = parseFloat(order.total_amount) || 0
      return sum + (orderAmount * 0.03) // 3% commission
    }, 0)
    const authorRevenue = totalRevenue - platformRevenue

    // Calculate today's revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOrders = paidOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today
    })
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)

    // Process payment data
    const processedPayments = orders?.map(order => {
      // Find user information
      const user = profiles?.find(profile => profile.id === order.user_id)
      
      // Get order items for this order
      const orderOrderItems = orderItems?.filter(item => item.order_id === order.id) || []
      
      // Get product and seller information for the first item (assuming single item orders for simplicity)
      const firstItem = orderOrderItems[0]
      const product = firstItem ? products?.find(p => p.id === firstItem.product_id) : null
      const seller = product ? profiles?.find(p => p.id === product.seller_id) : null

      // Calculate fees - 3% + Rp 5,000 fixed fee like Gumroad
      const orderAmount = parseFloat(order.total_amount) || 0
      const platformFee = orderAmount * 0.03 // 3% commission
      const authorEarnings = orderAmount - platformFee

      return {
        id: `PAY-${order.id.slice(0, 8).toUpperCase()}`,
        orderId: order.order_number,
        customer: user?.name || 'Unknown User',
        customerEmail: user?.email || 'No email',
        product: product?.title || 'Unknown Product',
        author: seller?.name || 'Unknown Seller',
        amount: orderAmount,
        platformFee: platformFee,
        authorEarnings: authorEarnings,
        paymentMethod: 'Xendit', // Since you're using Xendit
        paymentProvider: 'Xendit',
        status: order.status,
        createdAt: order.created_at,
        completedAt: order.status === 'paid' ? order.updated_at : null,
        transactionId: `TXN-${order.id.slice(0, 8).toUpperCase()}`,
        failureReason: order.status === 'cancelled' ? 'Order cancelled' : null
      }
    }) || []

    return NextResponse.json({
      payments: processedPayments,
      stats: {
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        totalRevenue,
        platformRevenue,
        authorRevenue,
        todayRevenue
      }
    })

  } catch (error) {
    console.error('[ADMIN PAYMENTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 