import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get recent orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, user_id, guest_email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[LIST ORDERS] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      orders: orders || []
    })

  } catch (error) {
    console.error('[LIST ORDERS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch orders' 
    }, { status: 500 })
  }
} 