import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerIds = searchParams.get('sellerIds')

    if (!sellerIds) {
      return NextResponse.json({ error: 'Seller IDs are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[SELLERS API] Fetching sellers:', sellerIds)

    // Parse seller IDs from comma-separated string
    const sellerIdArray = sellerIds.split(',')

    // Fetch seller information from profiles table
    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('id, name, business_name')
      .in('id', sellerIdArray)

    console.log('[SELLERS API] Sellers result:', { sellers, error })

    if (error) {
      console.error('Error fetching sellers:', error)
      return NextResponse.json({ error: 'Failed to fetch sellers' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sellers: sellers || []
    })
  } catch (error) {
    console.error('[SELLERS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 