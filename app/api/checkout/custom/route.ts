import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { xenditAPI } from '@/lib/xendit'
import { OrderService } from '@/lib/order-service'

export async function POST(req: NextRequest) {
  // For Next.js 14.x, use synchronous cookies()
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
  const orderService = new OrderService(supabase);

  // Debug: print incoming request headers and method
  console.log('[DEBUG] Incoming request:', req.method, req.headers);

  // Retrieve the current user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[DEBUG] Supabase user:', user);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const orderData = await req.json();
  console.log('[DEBUG] Received orderData:', orderData);

  // Overwrite user_id/email/name in orderData
  orderData.user_id = user.id;
  orderData.user_email = user.email;
  orderData.user_name = user.user_metadata?.full_name || user.email;
  orderData.guest_name = null;
  orderData.guest_email = null;

  try {
    const { order, error: orderError } = await orderService.createOrderWithoutPayment(orderData);
    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json({ error: 'Failed to create order', details: orderError }, { status: 400 });
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Failed to create order - order is null' }, { status: 500 });
    }
    
    // Debug log: print received orderData
    console.log('[DEBUG] orderData received:', orderData)
    // Debug log: print returned order
    console.log('[DEBUG] order returned from createOrder:', order)

    const paymentMethod = orderData.payment_method
    console.log('[DEBUG] Payment method:', paymentMethod)

    // Use v2 endpoint for ALL payment methods
    console.log('[DEBUG] Using Xendit v2 for payment method:', paymentMethod)
    
    // Validate phone number for payment methods that require it
    const phoneRequiredMethods = ['ASTRAPAY', 'SHOPEEPAY']
    if (phoneRequiredMethods.includes(paymentMethod) && !orderData.user_phone && !orderData.guest_phone) {
      return NextResponse.json({ 
        error: 'Phone number is required for this payment method. Please provide a valid phone number.' 
      }, { status: 400 })
    }

    // Create v2 payment for all payment methods
    const customerName = orderData.user_name || orderData.guest_name || 'Customer'
    const customerEmail = orderData.user_email || orderData.guest_email || 'customer@example.com'
    const customerPhone = orderData.user_phone || orderData.guest_phone

    const paymentData = {
      external_id: order.id,
      amount: order.total_amount + order.tax_amount,
      payment_method: paymentMethod,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      callback_url: `https://jualdigital.id/api/payments/callback`,
      redirect_url: `https://jualdigital.id/payment/success`,
      description: `Pembelian produk digital - Order #${order.order_number}`,
    }

    console.log('[XENDIT V2 DEBUG] Payment request:', paymentData)

    const paymentResponse = await xenditAPI.createPayment(paymentData)

    // Update order with payment information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: paymentResponse.id,
        payment_method: paymentMethod,
        invoice_url: paymentResponse.checkout_url || paymentResponse.qr_code_url || paymentResponse.account_number || paymentResponse.payment_code,
        transaction_id: paymentResponse.id,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Order update error:', updateError)
      throw new Error('Failed to update order with payment information')
    }

    return new Response(JSON.stringify({ 
      order, 
      paymentData,
      success: true 
    }), { status: 200 });

  } catch (err: any) {
    console.error('Custom checkout error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Checkout failed' }), { status: 500 });
  }
} 