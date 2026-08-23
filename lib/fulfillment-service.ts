import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * After an order becomes paid, create type-specific fulfillment records.
 * Digital products keep download-only flow (no extra rows).
 */
export async function fulfillPaidOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select(
      `
      id,
      product_id,
      variant_id,
      price,
      products:product_id (
        id,
        product_type,
        seller_id,
        price
      )
    `
    )
    .eq('order_id', orderId)

  if (error || !items?.length) {
    console.error('[FULFILL] Failed to load order items', error)
    return
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, guest_email')
    .eq('id', orderId)
    .single()

  for (const item of items) {
    const product = item.products as unknown as {
      id: string
      product_type?: string
      seller_id: string
      price: number
    } | null
    if (!product) continue

    const type = product.product_type || 'digital_product'

    if (type === 'service') {
      await fulfillService(supabase, item, product, order?.user_id ?? null)
    } else if (type === 'course') {
      if (order?.user_id) {
        await fulfillCourse(supabase, item, product, order.user_id)
      }
    }
    // membership uses subscribe flow, not one-shot cart fulfill
  }
}

async function fulfillService(
  supabase: SupabaseClient,
  item: { id: string; product_id: string; variant_id?: string | null; price: number },
  product: { id: string; seller_id: string },
  buyerId: string | null
) {
  const { data: existing } = await supabase
    .from('service_orders')
    .select('id')
    .eq('order_item_id', item.id)
    .maybeSingle()
  if (existing) return

  // Match package by price or first package
  const { data: packages } = await supabase
    .from('service_packages')
    .select('*')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true })

  const pkg =
    packages?.find((p) => Number(p.price) === Number(item.price)) || packages?.[0]
  if (!pkg) {
    console.warn('[FULFILL] No service package for product', product.id)
    return
  }

  const due = new Date()
  due.setDate(due.getDate() + (pkg.delivery_days || 3))

  const { error } = await supabase.from('service_orders').insert({
    order_item_id: item.id,
    product_id: product.id,
    package_id: pkg.id,
    buyer_id: buyerId,
    seller_id: product.seller_id,
    status: 'awaiting_requirements',
    due_at: due.toISOString(),
  })
  if (error) console.error('[FULFILL] service_orders insert', error)
}

async function fulfillCourse(
  supabase: SupabaseClient,
  item: { id: string; product_id: string },
  product: { id: string },
  userId: string
) {
  const { error } = await supabase.from('course_enrollments').upsert(
    {
      user_id: userId,
      product_id: product.id,
      order_item_id: item.id,
      enrolled_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,product_id' }
  )
  if (error) console.error('[FULFILL] course_enrollments upsert', error)
}
