import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-session'
import { createServiceRoleClient } from '@/lib/supabase-service'
import { formatPaymentLabels } from '@/lib/admin-payment-labels'

export const dynamic = 'force-dynamic'

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

const noStoreHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
  'X-Timestamp': Date.now().toString(),
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const statusFilter = req.nextUrl.searchParams.get('status') || 'all'
    // includePending=1 keeps pending rows in the transaction list (metrics still paid-only)
    const includePending = req.nextUrl.searchParams.get('includePending') !== '0'

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        'id, order_number, user_id, total_amount, status, payment_method, payment_provider, created_at, updated_at, transaction_id'
      )
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('[ADMIN REVENUE API] Orders query error:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(
        'id, order_id, product_id, product_title, quantity, price, seller_earnings, created_at'
      )

    if (itemsError) {
      console.error('[ADMIN REVENUE API] Order items query error:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }

    const { data: profiles } = await supabase.from('profiles').select('id, name, email, business_name')

    const productIds = [...new Set((orderItems || []).map((i) => i.product_id).filter(Boolean))]
    const { data: products } = productIds.length
      ? await supabase.from('products').select('id, title, seller_id').in('id', productIds)
      : { data: [] as { id: string; title: string; seller_id: string }[] }

    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id, amount, status, created_at')

    const orderById = new Map((orders || []).map((o) => [o.id, o]))
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))
    const productById = new Map((products || []).map((p) => [p.id, p]))

    // —— Metrics: only status=paid (from order_items to avoid double-count) ——
    let grossSales = 0
    let platformCommission = 0
    let sellerEarnings = 0
    let paidItemCount = 0
    let todayGross = 0
    let todayCommission = 0
    let monthGross = 0
    let monthCommission = 0

    const todayStart = startOfToday()
    const monthStart = startOfMonth()

    for (const item of orderItems || []) {
      const order = orderById.get(item.order_id)
      if (!order || order.status !== 'paid') continue

      const price = toNumber(item.price)
      const qty = item.quantity || 0
      const gross = price * qty
      const seller = toNumber(item.seller_earnings)
      // Prefer stored split; fall back to ~3% if seller_earnings missing
      const fee = seller > 0 || gross === 0 ? Math.max(0, gross - seller) : gross * 0.03
      const sellerShare = seller > 0 || gross === 0 ? seller : gross - fee

      grossSales += gross
      platformCommission += fee
      sellerEarnings += sellerShare
      paidItemCount += 1

      const paidAt = new Date(order.updated_at || order.created_at || item.created_at)
      if (paidAt >= todayStart) {
        todayGross += gross
        todayCommission += fee
      }
      if (paidAt >= monthStart) {
        monthGross += gross
        monthCommission += fee
      }
    }

    const paidOrders = (orders || []).filter((o) => o.status === 'paid')
    const pendingOrders = (orders || []).filter((o) => o.status === 'pending')
    const paidOrdersAmount = paidOrders.reduce((s, o) => s + toNumber(o.total_amount), 0)
    const pendingOrdersAmount = pendingOrders.reduce((s, o) => s + toNumber(o.total_amount), 0)

    const withdrawalRows = withdrawals || []
    const withdrawalsPending = withdrawalRows.filter((w) => w.status === 'pending')
    const withdrawalsCompleted = withdrawalRows.filter(
      (w) => w.status === 'completed' || w.status === 'approved'
    )
    const withdrawalsPendingAmount = withdrawalsPending.reduce((s, w) => s + toNumber(w.amount), 0)
    const withdrawalsCompletedAmount = withdrawalsCompleted.reduce((s, w) => s + toNumber(w.amount), 0)

    // —— Transaction list: one row per order_item (paid + optionally pending) ——
    const transactions = (orderItems || [])
      .map((item) => {
        const order = orderById.get(item.order_id)
        if (!order) return null
        if (order.status === 'paid') {
          // keep
        } else if (includePending && order.status === 'pending') {
          // keep
        } else {
          return null
        }

        if (statusFilter === 'paid' && order.status !== 'paid') return null
        if (statusFilter === 'pending' && order.status !== 'pending') return null

        const price = toNumber(item.price)
        const qty = item.quantity || 0
        const gross = price * qty
        const seller = toNumber(item.seller_earnings)
        const fee =
          order.status === 'paid'
            ? seller > 0 || gross === 0
              ? Math.max(0, gross - seller)
              : gross * 0.03
            : Math.max(0, gross - (seller || gross * 0.97))
        const sellerShare =
          order.status === 'paid'
            ? seller > 0 || gross === 0
              ? seller
              : gross - fee
            : seller || gross * 0.97

        const buyer = profileById.get(order.user_id)
        const product = productById.get(item.product_id)
        const sellerProfile = product?.seller_id ? profileById.get(product.seller_id) : null
        const labels = formatPaymentLabels(order.payment_provider, order.payment_method)

        return {
          id: item.id,
          orderId: order.id,
          orderNumber: order.order_number,
          date: order.created_at,
          paidAt: order.status === 'paid' ? order.updated_at || order.created_at : null,
          buyerName: buyer?.name || 'Pembeli tidak diketahui',
          buyerEmail: buyer?.email || '—',
          productTitle: item.product_title || product?.title || 'Produk tidak diketahui',
          productId: item.product_id,
          sellerName: sellerProfile?.business_name || sellerProfile?.name || '—',
          quantity: qty,
          unitPrice: price,
          gross,
          platformFee: fee,
          sellerEarnings: sellerShare,
          paymentMethod: labels.paymentMethod,
          paymentProvider: labels.paymentProvider,
          status: order.status,
          transactionId: order.transaction_id || null,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = new Date(a!.date).getTime()
        const db = new Date(b!.date).getTime()
        return db - da
      })

    return NextResponse.json(
      {
        metrics: {
          grossSales,
          platformCommission,
          sellerEarnings,
          paidItemCount,
          paidOrdersCount: paidOrders.length,
          pendingOrdersCount: pendingOrders.length,
          paidOrdersAmount,
          pendingOrdersAmount,
          todayGross,
          todayCommission,
          monthGross,
          monthCommission,
          // Platform keeps commission; withdrawals only move seller share off-platform
          withdrawalsPendingCount: withdrawalsPending.length,
          withdrawalsPendingAmount,
          withdrawalsCompletedCount: withdrawalsCompleted.length,
          withdrawalsCompletedAmount,
          // Net platform profit ≈ commission (withdrawals do not reduce platform fee)
          platformNet: platformCommission,
        },
        transactions,
        meta: {
          generatedAt: new Date().toISOString(),
          pollHintSeconds: 12,
          note: 'Pendapatan hanya dari pesanan berstatus paid. Komisi = (harga×qty) − seller_earnings (~3%).',
        },
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('[ADMIN REVENUE API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
