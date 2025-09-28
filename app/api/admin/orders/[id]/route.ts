import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get order by ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (orderError) {
      console.error('[ADMIN ORDER API] Order query error:', orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', order.user_id)
      .single()

    if (userError) {
      console.error('[ADMIN ORDER API] User query error:', userError)
    }

    // Get order items
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.id)

    if (orderItemsError) {
      console.error('[ADMIN ORDER API] Order items query error:', orderItemsError)
    }

    // Get products for order items
    const productIds = orderItems?.map(item => item.product_id) || []
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, image_url')
      .in('id', productIds)

    if (productsError) {
      console.error('[ADMIN ORDER API] Products query error:', productsError)
    }

    // Process order items with product information
    const processedItems = orderItems?.map(item => {
      const product = products?.find(p => p.id === item.product_id)
      return {
        id: item.id,
        product_id: item.product_id,
        product_title: product?.title || 'Unknown Product',
        product_image: product?.image_url,
        quantity: item.quantity || 0,
        price: parseFloat(item.price) || 0,
        seller_earnings: parseFloat(item.seller_earnings) || 0
      }
    }) || []

    const processedOrder = {
      ...order,
      total_amount: parseFloat(order.total_amount) || 0,
      userName: user?.name || 'Unknown User',
      userEmail: user?.email || 'No email',
      items: processedItems
    }

    return NextResponse.json({ order: processedOrder })

  } catch (error) {
    console.error('[ADMIN ORDER API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

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

    // Update order
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[ADMIN ORDER API] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('[ADMIN ORDER API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 