import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-session'
import { createServiceRoleClient } from '@/lib/supabase-service'
import { sendWithdrawalApproved, sendWithdrawalRejected, sendWithdrawalCompleted } from '@/lib/email-service'

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>

type OrderJoin = {
  order_number: string | null
  created_at: string | null
  status: string
}

type PaidOrderItemRow = {
  id: string
  price: number | null
  quantity: number | null
  seller_earnings: number | null
  product_title: string | null
  created_at: string | null
  orders: OrderJoin | OrderJoin[] | null
}

function unwrapOrder(orders: PaidOrderItemRow['orders']): OrderJoin | null {
  if (!orders) return null
  return Array.isArray(orders) ? orders[0] || null : orders
}

type WithdrawalAmountRow = {
  id: string
  amount: number | null
  status: string
}

async function buildSellerEarningsContext(
  supabase: SupabaseAdmin,
  sellerId: string,
  withdrawalId: string,
  requestedAmount: number
) {
  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select(
      `
      id,
      price,
      quantity,
      seller_earnings,
      product_title,
      created_at,
      orders!inner (
        order_number,
        created_at,
        status
      )
    `
    )
    .eq('seller_id', sellerId)
    .eq('orders.status', 'paid')
    .order('created_at', { ascending: false })
    .limit(50)

  if (orderItemsError) {
    console.error('[ADMIN WITHDRAWAL API] Order items error:', orderItemsError)
    throw new Error('Failed to fetch seller order history')
  }

  const items = (orderItems || []) as PaidOrderItemRow[]

  let totalFromPaidOrders = 0
  let totalGrossSales = 0
  let platformEarnings = 0

  const recentPaidOrders = items.map((item) => {
    const qty = item.quantity || 0
    const unit = item.price || 0
    const gross = unit * qty
    const sellerEarnings = item.seller_earnings || 0
    const platformFee = Math.max(0, gross - sellerEarnings)
    const order = unwrapOrder(item.orders)

    totalFromPaidOrders += sellerEarnings
    totalGrossSales += gross
    platformEarnings += platformFee

    return {
      id: item.id,
      order_number: order?.order_number || '—',
      product_title: item.product_title || 'Produk',
      date: order?.created_at || item.created_at,
      gross,
      seller_earnings: sellerEarnings,
      platform_fee: platformFee,
    }
  })

  // If we only fetched 50 recent rows for history, recompute totals from all paid items
  const { data: allEarningsRows, error: allEarningsError } = await supabase
    .from('order_items')
    .select('price, quantity, seller_earnings, orders!inner(status)')
    .eq('seller_id', sellerId)
    .eq('orders.status', 'paid')

  if (allEarningsError) {
    console.error('[ADMIN WITHDRAWAL API] All earnings error:', allEarningsError)
    throw new Error('Failed to compute seller earnings')
  }

  totalFromPaidOrders = 0
  totalGrossSales = 0
  platformEarnings = 0
  for (const row of allEarningsRows || []) {
    const qty = (row as { quantity?: number }).quantity || 0
    const unit = (row as { price?: number }).price || 0
    const gross = unit * qty
    const sellerEarnings = (row as { seller_earnings?: number }).seller_earnings || 0
    totalFromPaidOrders += sellerEarnings
    totalGrossSales += gross
    platformEarnings += Math.max(0, gross - sellerEarnings)
  }

  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawals')
    .select('id, amount, status')
    .eq('seller_id', sellerId)
    .in('status', ['pending', 'approved', 'completed'])

  if (withdrawalsError) {
    console.error('[ADMIN WITHDRAWAL API] Withdrawals sum error:', withdrawalsError)
    throw new Error('Failed to compute withdrawal deductions')
  }

  const rows = (withdrawals || []) as WithdrawalAmountRow[]

  const deducted = {
    pending: 0,
    approved: 0,
    completed: 0,
    total: 0,
  }

  let otherDeducted = 0

  for (const w of rows) {
    const amount = w.amount || 0
    if (w.status === 'pending') deducted.pending += amount
    else if (w.status === 'approved') deducted.approved += amount
    else if (w.status === 'completed') deducted.completed += amount
    deducted.total += amount

    if (w.id !== withdrawalId) {
      otherDeducted += amount
    }
  }

  // Remaining after all reserved/paid withdrawals (including this request if pending)
  const availableBalance = Math.max(0, totalFromPaidOrders - deducted.total)

  // Balance that should cover THIS request (exclude this row from deductions)
  const balanceBeforeThisRequest = Math.max(0, totalFromPaidOrders - otherDeducted)
  const wouldExceedBalance = requestedAmount > balanceBeforeThisRequest

  return {
    earnings_summary: {
      total_from_paid_orders: totalFromPaidOrders,
      deducted_withdrawals: deducted,
      available_balance: availableBalance,
      balance_before_this_request: balanceBeforeThisRequest,
      requested_amount: requestedAmount,
      would_exceed_balance: wouldExceedBalance,
    },
    platform_earnings: {
      total_gross_sales: totalGrossSales,
      total_platform_fee: platformEarnings,
      commission_rate_note: 'Komisi platform ~5% dari penjualan (price×qty − seller_earnings). Biaya penarikan = Rp 0.',
    },
    recent_paid_orders: recentPaidOrders,
  }
}

function noCacheHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

/**
 * GET /api/admin/withdrawals/[id]
 * Detail for admin review: withdrawal, seller, saldo calculation,
 * platform fee, and recent paid order history.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[ADMIN WITHDRAWAL API] GET fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch withdrawal' }, { status: 500 })
    }

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, business_name, email, role, seller_status, status')
      .eq('id', withdrawal.seller_id)
      .maybeSingle()

    const context = await buildSellerEarningsContext(
      supabase,
      withdrawal.seller_id,
      withdrawal.id,
      withdrawal.amount || 0
    )

    return NextResponse.json(
      {
        withdrawal: {
          ...withdrawal,
          profiles: profile
            ? {
                id: profile.id,
                name: profile.name,
                business_name: profile.business_name,
                email: profile.email,
                role: profile.role,
                seller_status: profile.seller_status,
                status: profile.status,
              }
            : null,
        },
        ...context,
      },
      { headers: noCacheHeaders() }
    )
  } catch (error) {
    console.error('[ADMIN WITHDRAWAL API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const supabase = createServiceRoleClient()

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

    // Block approve when amount exceeds seller's coverable balance
    if (status === 'approved') {
      try {
        const context = await buildSellerEarningsContext(
          supabase,
          existing.seller_id,
          existing.id,
          existing.amount || 0
        )
        if (context.earnings_summary.would_exceed_balance) {
          return NextResponse.json(
            {
              error:
                'Jumlah penarikan melebihi saldo tersedia seller. Tidak dapat disetujui.',
              earnings_summary: context.earnings_summary,
            },
            { status: 400 }
          )
        }
      } catch (balanceError) {
        console.error('[ADMIN WITHDRAWAL API] Balance check error:', balanceError)
        return NextResponse.json(
          { error: 'Gagal memverifikasi saldo seller sebelum persetujuan' },
          { status: 500 }
        )
      }
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
      console.error('[ADMIN WITHDRAWAL API] Update matched 0 rows:', params.id)
      return NextResponse.json({ error: 'Withdrawal not found or update failed' }, { status: 404 })
    }

    const updatedWithdrawal = updatedWithdrawals[0]

    if (updatedWithdrawal.status !== status) {
      console.error('[ADMIN WITHDRAWAL API] Status mismatch after update', {
        expected: status,
        got: updatedWithdrawal.status,
        id: params.id,
      })
      return NextResponse.json(
        { error: 'Update did not persist status change' },
        { status: 500 }
      )
    }

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
      { headers: noCacheHeaders() }
    )
  } catch (error) {
    console.error('[ADMIN WITHDRAWAL API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
