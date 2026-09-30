import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-session'
import { createServiceRoleClient } from '@/lib/supabase-service'

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()

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

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('[ADMIN WITHDRAWALS API] Profiles query error:', profilesError)
    }

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

    const totalWithdrawals = processedWithdrawals?.length || 0
    const pendingWithdrawals = processedWithdrawals?.filter(w => w.status === 'pending').length || 0
    const approvedWithdrawals = processedWithdrawals?.filter(w => w.status === 'approved').length || 0
    const rejectedWithdrawals = processedWithdrawals?.filter(w => w.status === 'rejected').length || 0
    const completedWithdrawals = processedWithdrawals?.filter(w => w.status === 'completed').length || 0

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

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
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
