import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-session'
import { createClient } from '@supabase/supabase-js'
import { sendWithdrawalApproved, sendWithdrawalRejected, sendWithdrawalCompleted } from '@/lib/email-service'

/**
 * Admin withdrawal status updates.
 * Buyer checkout uses DANA — seller payouts are manual bank transfer by admin only.
 * No Xendit / automatic disbursement.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const status = body.status as string | undefined

    if (!status || !['approved', 'rejected', 'completed', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[ADMIN WITHDRAWAL API] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch withdrawal details' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const updateData: {
      status: string
      processed_at?: string
      rejection_reason?: string
      xendit_transfer_id?: string
    } = { status }

    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      updateData.processed_at = new Date().toISOString()
    }

    if (status === 'rejected' && body.rejection_reason) {
      updateData.rejection_reason = body.rejection_reason
    }

    // Manual bank payout reference (legacy column name kept for schema compatibility)
    if (status === 'approved') {
      updateData.xendit_transfer_id =
        typeof body.transfer_id === 'string' && body.transfer_id.trim()
          ? body.transfer_id.trim()
          : `MANUAL-${Date.now()}`
    }

    const { data: updatedWithdrawals, error: updateError } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', params.id)
      .select()

    if (updateError) {
      console.error('[ADMIN WITHDRAWAL API] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update withdrawal', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedWithdrawals?.length) {
      return NextResponse.json({ error: 'Withdrawal not found or update failed' }, { status: 404 })
    }

    const updatedWithdrawal = updatedWithdrawals[0]

    try {
      const { data: sellerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', updatedWithdrawal.seller_id)
        .single()

      if (!profileError && sellerProfile?.email) {
        if (status === 'approved') {
          await sendWithdrawalApproved({
            to: sellerProfile.email,
            sellerName: sellerProfile.name || 'Seller',
            amount: updatedWithdrawal.amount,
            bankName: updatedWithdrawal.bank_name,
            accountNumber: updatedWithdrawal.account_number,
            accountName: updatedWithdrawal.account_name,
          })
        } else if (status === 'rejected') {
          await sendWithdrawalRejected({
            to: sellerProfile.email,
            sellerName: sellerProfile.name || 'Seller',
            amount: updatedWithdrawal.amount,
            rejectionReason: body.rejection_reason,
          })
        } else if (status === 'completed') {
          await sendWithdrawalCompleted({
            to: sellerProfile.email,
            sellerName: sellerProfile.name || 'Seller',
            amount: updatedWithdrawal.amount,
            bankName: updatedWithdrawal.bank_name,
            accountNumber: updatedWithdrawal.account_number,
            transferId: updatedWithdrawal.xendit_transfer_id,
          })
        }
      }
    } catch (emailError) {
      console.error('[ADMIN WITHDRAWAL API] Error sending email:', emailError)
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal: updatedWithdrawal,
        payoutMode: 'manual',
        transferId: updatedWithdrawal.xendit_transfer_id || null,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('[ADMIN WITHDRAWAL API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
