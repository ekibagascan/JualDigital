import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { OrderService, type OrderItem } from '@/lib/order-service'

type MobileCheckoutItem = {
  productId?: string
  product_id?: string
  variantId?: string | null
  variant_id?: string | null
  packageId?: string | null
  package_id?: string | null
  quantity?: number
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = await req.json()
    // guest_email / guest_name accepted for API shape; ignored when Bearer user present

    const rawItems: MobileCheckoutItem[] = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const productIds = [
      ...new Set(
        rawItems
          .map((i) => i.productId || i.product_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ]

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'Item produk tidak valid' }, { status: 400 })
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, seller_id, title, price, image_url, status')
      .in('id', productIds)
      .eq('status', 'active')

    if (productsError) {
      console.error('[MOBILE CHECKOUT] products', productsError)
      return NextResponse.json({ error: 'Gagal memvalidasi produk' }, { status: 500 })
    }

    const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]))

    const orderItems: OrderItem[] = []
    for (const raw of rawItems) {
      const productId = raw.productId || raw.product_id
      if (!productId || !productMap[productId]) {
        return NextResponse.json(
          { error: 'Satu atau lebih produk tidak tersedia' },
          { status: 400 }
        )
      }
      const quantity = Math.max(1, Number(raw.quantity) || 1)
      const product = productMap[productId]
      orderItems.push({
        product_id: productId,
        seller_id: product.seller_id,
        title: product.title,
        price: Number(product.price) || 0,
        quantity,
        image_url: product.image_url || undefined,
        variant_id: raw.variantId ?? raw.variant_id ?? null,
        package_id: raw.packageId ?? raw.package_id ?? null,
      })
    }

    const orderService = new OrderService(supabase)
    const { order, paymentUrl } = await orderService.createOrder({
      user_id: user.id,
      items: orderItems,
      total_amount: orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      tax_amount: 0,
      payment_method: body.payment_method || 'fiat',
      note: typeof body.note === 'string' ? body.note : undefined,
    })

    const checkoutUrl =
      paymentUrl ||
      `https://jualdigital.id/payment/instructions?order_id=${order.id}`

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      checkout_url: checkoutUrl,
    })
  } catch (error: unknown) {
    console.error('[MOBILE CHECKOUT] Error:', error)
    const message = error instanceof Error ? error.message : 'Checkout gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
