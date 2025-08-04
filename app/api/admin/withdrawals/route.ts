import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

    // Get all withdrawals first
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (withdrawalsError) {
      console.error('[ADMIN WITHDRAWALS API] Withdrawals query error:', withdrawalsError)
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      )
    }

    // Get all profiles for seller information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('[ADMIN WITHDRAWALS API] Profiles query error:', profilesError)
    }

    // Process withdrawals with seller information
    const processedWithdrawals = withdrawals?.map(withdrawal => {
      const seller = profiles?.find(p => p.id === withdrawal.seller_id)
      return {
        ...withdrawal,
        profiles: {
          id: withdrawal.seller_id,
          name: seller?.name,
          business_name: seller?.business_name,
          email: seller?.email,
          total_earnings: seller?.total_earnings || 0
        }
      }
    }) || []

    if (withdrawalsError) {
      console.error('[ADMIN WITHDRAWALS API] Withdrawals query error:', withdrawalsError)
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      )
    }

    // Calculate stats
    const totalWithdrawals = processedWithdrawals?.length || 0
    const pendingWithdrawals = processedWithdrawals?.filter(w => w.status === 'pending').length || 0
    const approvedWithdrawals = processedWithdrawals?.filter(w => w.status === 'approved').length || 0
    const rejectedWithdrawals = processedWithdrawals?.filter(w => w.status === 'rejected').length || 0
    const completedWithdrawals = processedWithdrawals?.filter(w => w.status === 'completed').length || 0

    // Calculate total amounts
    const totalAmount = processedWithdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
    const pendingAmount = processedWithdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0) || 0
    const approvedAmount = processedWithdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0) || 0
    const completedAmount = processedWithdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    const response = NextResponse.json({
      withdrawals: processedWithdrawals || [],
      stats: {
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawals,
        rejectedWithdrawals,
        completedWithdrawals,
        totalAmount,
        pendingAmount,
        approvedAmount,
        completedAmount
      }
    })

    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Last-Modified', new Date().toUTCString())

    return response

  } catch (error) {
    console.error('[ADMIN WITHDRAWALS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 