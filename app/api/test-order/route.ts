import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OrderService } from '@/lib/order-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json()
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    console.log('[TEST ORDER] Creating test order for email:', userEmail)

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, check if user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', userEmail)
      .single()

    let finalUser = user

    if (userError || !user) {
      console.log('[TEST ORDER] User not found, creating test user...')
      // Create a test user
      const { data: newUser, error: createUserError } = await supabase
        .from('profiles')
        .insert({
          id: 'test-user-' + Date.now(),
          email: userEmail,
          name: 'Test User',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createUserError) {
        console.error('[TEST ORDER] Failed to create test user:', createUserError)
        return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 })
      }

      console.log('[TEST ORDER] Test user created:', newUser.id)
      finalUser = newUser
    } else {
      console.log('[TEST ORDER] Found existing user:', user.id)
    }

    if (!finalUser) {
      return NextResponse.json({ error: 'Failed to get or create user' }, { status: 500 })
    }

    const orderService = new OrderService(supabase as unknown as SupabaseClient)

    // Create a test order
    const testOrderData = {
      user_id: finalUser.id,
      items: [
        {
          product_id: 'test-product-1',
          seller_id: 'test-seller-1',
          title: 'Test Product 1',
          price: 50000,
          quantity: 1,
          image_url: 'https://via.placeholder.com/150'
        }
      ],
      total_amount: 50000,
      tax_amount: 0,
      payment_method: 'bank_transfer',
      note: 'Test order for email testing'
    }

    console.log('[TEST ORDER] Creating order with data:', testOrderData)

    // First, create a test product if it doesn't exist
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('id', 'test-product-1')
      .single()

    if (!existingProduct) {
      console.log('[TEST ORDER] Creating test product...')
      await supabase
        .from('products')
        .insert({
          id: 'test-product-1',
          title: 'Test Product 1',
          description: 'A test product for email testing',
          price: 50000,
          category: 'test',
          seller_id: 'test-seller-1',
          status: 'active',
          delivery_method: 'download'
        })
    }

    // Create the order
    const { order, paymentUrl } = await orderService.createOrder(testOrderData)

    console.log('[TEST ORDER] Order created successfully:', order.id)
    console.log('[TEST ORDER] Order number:', order.order_number)

    return NextResponse.json({ 
      success: true, 
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status
      },
      paymentUrl
    })

  } catch (error) {
    console.error('[TEST ORDER] Error creating test order:', error)
    return NextResponse.json({ 
      error: 'Failed to create test order' 
    }, { status: 500 })
  }
} 