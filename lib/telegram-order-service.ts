import { createClient } from "@supabase/supabase-js"
import {
  getTelegramProductStarsPrice,
  isTelegramCheckoutProduct,
  type TelegramCheckoutProductLike,
} from "@/lib/telegram-checkout"

interface InitTelegramOrderInput {
  productId: string
  telegramUserId: string
  telegramChatId?: string
  quantity?: number
}

interface FinalizeTelegramPaymentInput {
  invoicePayload: string
  telegramPaymentChargeId: string
  providerPaymentChargeId?: string
  telegramUserId?: string
  starsAmount?: number
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function recordTelegramEvent(params: {
  orderId: string
  eventType: string
  telegramUserId?: string
  telegramPaymentChargeId?: string
  providerPaymentChargeId?: string
  starsAmount?: number
  rawPayload?: unknown
}) {
  try {
    const supabase = getServiceSupabase()
    await supabase.from("telegram_payment_events").insert({
      order_id: params.orderId,
      event_type: params.eventType,
      telegram_user_id: params.telegramUserId || null,
      telegram_payment_charge_id: params.telegramPaymentChargeId || null,
      provider_payment_charge_id: params.providerPaymentChargeId || null,
      stars_amount: params.starsAmount || null,
      raw_payload: params.rawPayload || null,
    })
  } catch {
    // Non-blocking: keep checkout flow alive even if event logging table is not migrated yet.
  }
}

function getInvoicePayloadOrderId(invoicePayload: string): string {
  const parts = invoicePayload.split(":")
  if (parts.length < 2 || parts[0] !== "tgstars") {
    throw new Error("Invalid invoice payload format")
  }
  return parts[1]
}

export async function initTelegramOrder(input: InitTelegramOrderInput) {
  const supabase = getServiceSupabase()
  const quantity = Math.max(1, Math.min(input.quantity || 1, 10))

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, title, description, seller_id, price, tags, delivery_method, telegram_enabled, telegram_stars_price")
    .eq("id", input.productId)
    .single()

  if (productError || !product) {
    throw new Error("Product not found")
  }

  if (!isTelegramCheckoutProduct(product as TelegramCheckoutProductLike)) {
    throw new Error("Product is not enabled for Telegram checkout")
  }

  const starsPrice = getTelegramProductStarsPrice(product as TelegramCheckoutProductLike, product.price)
  const totalStars = starsPrice * quantity

  const notePayload = {
    channel: "telegram",
    telegram_user_id: input.telegramUserId,
    telegram_chat_id: input.telegramChatId || null,
    stars_unit_price: starsPrice,
    stars_total: totalStars,
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      guest_name: `Telegram User ${input.telegramUserId}`,
      guest_email: null,
      total_amount: totalStars,
      tax_amount: 0,
      platform_fee: 0,
      status: "pending",
      payment_method: "TELEGRAM_STARS",
      payment_provider: "telegram",
      note: JSON.stringify(notePayload),
    })
    .select("id, order_number, status, total_amount")
    .single()

  if (orderError || !order) {
    throw new Error("Failed to create telegram order")
  }

  const { error: orderItemsError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    seller_id: product.seller_id,
    product_title: product.title,
    product_image: null,
    price: starsPrice,
    quantity,
    seller_earnings: starsPrice * quantity,
  })

  if (orderItemsError) {
    throw new Error("Failed to create order items")
  }

  const invoicePayload = `tgstars:${order.id}:${Date.now()}`
  const { error: updateOrderError } = await supabase
    .from("orders")
    .update({ transaction_id: invoicePayload })
    .eq("id", order.id)

  if (updateOrderError) {
    throw new Error("Failed to update telegram invoice payload")
  }

  await recordTelegramEvent({
    orderId: order.id,
    eventType: "invoice_sent",
    telegramUserId: input.telegramUserId,
    starsAmount: totalStars,
    rawPayload: { invoicePayload },
  })

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    invoicePayload,
    title: product.title,
    description: product.description || product.title,
    currency: "XTR",
    starsAmount: totalStars,
    quantity,
  }
}

export async function finalizeTelegramPayment(input: FinalizeTelegramPaymentInput) {
  const supabase = getServiceSupabase()
  const orderId = getInvoicePayloadOrderId(input.invoicePayload)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_id, transaction_id")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    throw new Error("Order not found")
  }

  if (order.status === "paid") {
    await recordTelegramEvent({
      orderId: order.id,
      eventType: "successful_payment_duplicate",
      telegramUserId: input.telegramUserId,
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      providerPaymentChargeId: input.providerPaymentChargeId,
      starsAmount: input.starsAmount,
      rawPayload: input,
    })

    return {
      alreadyProcessed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      deliveryItems: [],
    }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_id: input.telegramPaymentChargeId,
      transaction_id: input.providerPaymentChargeId || order.transaction_id,
      payment_method: "TELEGRAM_STARS",
      payment_provider: "telegram",
    })
    .eq("id", order.id)
    .neq("status", "paid")

  if (updateError) {
    throw new Error("Failed to update order payment status")
  }

  await recordTelegramEvent({
    orderId: order.id,
    eventType: "successful_payment",
    telegramUserId: input.telegramUserId,
    telegramPaymentChargeId: input.telegramPaymentChargeId,
    providerPaymentChargeId: input.providerPaymentChargeId,
    starsAmount: input.starsAmount,
    rawPayload: input,
  })

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_title, products:product_id(title, download_link, file_url)")
    .eq("order_id", order.id)

  if (itemsError) {
    throw new Error("Failed to fetch order items")
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jualdigital.id"
  const deliveryItems = (items || []).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    const directLink = product?.download_link || null
    const fallbackLink = product?.file_url ? `${baseUrl}/api/download/${item.id}` : null
    return {
      title: product?.title || item.product_title,
      downloadUrl: directLink || fallbackLink || null,
    }
  })

  return {
    alreadyProcessed: false,
    orderId: order.id,
    orderNumber: order.order_number,
    deliveryItems,
  }
}
