import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

const MIN_WITHDRAWAL = 100_000
/** Absolute ceiling per request — still must also be <= available balance. */
const MAX_WITHDRAWAL = 50_000_000

const ALLOWED_BANKS = new Set(['bca', 'mandiri', 'bni', 'bri', 'cimb'])

type EarningsResult = {
  totalEarnings: number
  availableBalance: number
}

async function computeAvailableBalance(
  supabase: ReturnType<typeof serviceRoleClient>,
  sellerId: string
): Promise<EarningsResult> {
  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('seller_earnings, orders!inner(status)')
    .eq('seller_id', sellerId)
    .eq('orders.status', 'paid')

  if (orderItemsError) {
    console.error('[SELLER WITHDRAWALS] Earnings query error:', orderItemsError)
    throw new Error('Failed to compute earnings')
  }

  const totalEarnings =
    orderItems?.reduce(
      (sum, item: { seller_earnings: number | null }) => sum + (item.seller_earnings || 0),
      0
    ) || 0

  const { data: withdrawals, error: withdrawalError } = await supabase
    .from('withdrawals')
    .select('amount, status')
    .eq('seller_id', sellerId)
    .in('status', ['pending', 'approved', 'completed'])

  if (withdrawalError) {
    console.error('[SELLER WITHDRAWALS] Withdrawals query error:', withdrawalError)
    throw new Error('Failed to compute balance')
  }

  const deducted = withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

  return {
    totalEarnings,
    availableBalance: Math.max(0, totalEarnings - deducted),
  }
}

/**
 * POST /api/seller/withdrawals
 * Authenticated seller creates a bank-only withdrawal request.
 * Amount is validated server-side against paid order_items earnings
 * minus pending/approved/completed withdrawals.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = serviceRoleClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, seller_status, status')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[SELLER WITHDRAWALS] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to verify seller' }, { status: 500 })
    }

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json({ error: 'Seller account required' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Never trust client-supplied seller_id
    const rawAmount = pickBody<unknown>(body, 'amount')
    const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount)
    const bankName = String(pickBody<string>(body, 'bank_name', 'bankName') || '')
      .trim()
      .toLowerCase()
    const accountNumber = String(
      pickBody<string>(body, 'account_number', 'accountNumber') || ''
    ).trim()
    const accountName = String(
      pickBody<string>(body, 'account_name', 'accountName') || ''
    ).trim()

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Jumlah penarikan harus bilangan bulat positif' },
        { status: 400 }
      )
    }

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum penarikan adalah Rp ${MIN_WITHDRAWAL.toLocaleString('id-ID')}` },
        { status: 400 }
      )
    }

    if (amount > MAX_WITHDRAWAL) {
      return NextResponse.json(
        {
          error: `Maksimum penarikan per permintaan adalah Rp ${MAX_WITHDRAWAL.toLocaleString('id-ID')}`,
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_BANKS.has(bankName)) {
      return NextResponse.json(
        { error: 'Bank tidak didukung. Pilih BCA, Mandiri, BNI, BRI, atau CIMB Niaga.' },
        { status: 400 }
      )
    }

    if (!/^\d{8,20}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: 'Nomor rekening tidak valid (8–20 digit angka)' },
        { status: 400 }
      )
    }

    if (accountName.length < 3 || accountName.length > 100) {
      return NextResponse.json(
        { error: 'Nama pemilik rekening tidak valid' },
        { status: 400 }
      )
    }

    const { availableBalance, totalEarnings } = await computeAvailableBalance(supabase, user.id)

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: 'Saldo tidak mencukupi untuk penarikan ini',
          available_balance: availableBalance,
          total_earnings: totalEarnings,
        },
        { status: 400 }
      )
    }

    const { data: inserted, error: insertError } = await supabase
      .from('withdrawals')
      .insert({
        seller_id: user.id,
        amount,
        status: 'pending',
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      })
      .select()
      .maybeSingle()

    if (insertError || !inserted) {
      console.error('[SELLER WITHDRAWALS] Insert error:', insertError)
      return NextResponse.json({ error: 'Gagal membuat permintaan penarikan' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal: inserted,
        available_balance: availableBalance - amount,
        total_earnings: totalEarnings,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[SELLER WITHDRAWALS] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
