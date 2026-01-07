import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDokuCheckout } from '@/lib/doku'

export const dynamic = 'force-dynamic'

// This endpoint is kept for backward compatibility but now uses DOKU Checkout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // If order already has a checkout URL, return it
    if (order.invoice_url && order.invoice_url.includes('checkout.doku.com')) {
      return NextResponse.json({
        success: true,
        checkoutUrl: order.invoice_url,
      })
    }

    // Get customer information
    let customerName = order.guest_name || 'Customer'
    let customerEmail = order.guest_email || ''
    const customerId = order.user_id || undefined

    // If user_id exists, try to get user details
    if (order.user_id) {
      try {
        const { data: user } = await supabase.auth.admin.getUserById(order.user_id)
        if (user?.user) {
          customerName = user.user.user_metadata?.name || user.user.email?.split('@')[0] || customerName
          customerEmail = user.user.email || customerEmail
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    if (!customerEmail) {
      customerEmail = `customer-${order.id}@jualdigital.id`
    }

    // Fetch order items for line items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_title, price, quantity')
      .eq('order_id', orderId)

    const lineItems = (orderItems || []).map(item => ({
      name: item.product_title || 'Product',
      price: item.price,
      quantity: item.quantity,
    }))

    // Prepare payment URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const successUrl = `${baseUrl}/payment/success?order_id=${orderId}`
    const failureUrl = `${baseUrl}/payment/failed?order_id=${orderId}`
    const notificationUrl = `${baseUrl}/api/payments/doku/callback`

    const totalAmount = Math.round(order.total_amount + (order.tax_amount || 0))

    // Create DOKU Checkout session
    const checkoutResponse = await createDokuCheckout({
      order: {
        invoice_number: order.order_number,
        amount: totalAmount,
        currency: 'IDR',
        line_items: lineItems,
      },
      customer: {
        id: customerId,
        name: customerName,
        email: customerEmail,
      },
      payment: {
        payment_due_date: 60, // 60 minutes
      },
      url: {
        success_url: successUrl,
        failure_url: failureUrl,
        notification_url: notificationUrl,
      },
    })

    const checkoutUrl = checkoutResponse.response?.result?.checkout_url

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Failed to create DOKU Checkout session' },
        { status: 500 }
      )
    }

    // Update order with checkout URL
    await supabase
      .from('orders')
      .update({
        payment_provider: 'doku',
        payment_id: checkoutResponse.response?.result?.invoice_number,
        invoice_url: checkoutUrl,
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      expiresAt: checkoutResponse.response?.result?.expires_at,
    })
  } catch (error) {
    console.error('[DOKU CREATE CHECKOUT] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    )
  }
}

