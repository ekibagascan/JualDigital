import { createClient } from "@supabase/supabase-js"
import { WhatsAppService } from "@/lib/whatsapp-service"
import {
  getTelegramPricingBreakdown,
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

  const pricing = getTelegramPricingBreakdown({
    product: product as TelegramCheckoutProductLike,
    fallbackIdrPrice: product.price,
    quantity,
  })

  const notePayload = {
    channel: "telegram",
    telegram_user_id: input.telegramUserId,
    telegram_chat_id: input.telegramChatId || null,
    pricing,
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      guest_name: `Telegram User ${input.telegramUserId}`,
      guest_email: null,
      total_amount: pricing.totalStars,
      tax_amount: pricing.adminFeeStars,
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
    price: pricing.starsUnitBase,
    quantity,
    seller_earnings: pricing.starsSubtotalBase,
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
    starsAmount: pricing.totalStars,
    rawPayload: { invoicePayload },
  })

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    invoicePayload,
    title: product.title,
    description: product.description || product.title,
    currency: "XTR",
    starsAmount: pricing.totalStars,
    starsSubtotalBase: pricing.starsSubtotalBase,
    adminFeeStars: pricing.adminFeeStars,
    adminFeePercent: pricing.adminFeePercent,
    idrUnitPrice: pricing.idrUnitPrice,
    idrSubtotal: pricing.idrSubtotal,
    idrPerStar: pricing.idrPerStar,
    quantity,
  }
}

export async function finalizeTelegramPayment(input: FinalizeTelegramPaymentInput) {
  const supabase = getServiceSupabase()
  const orderId = getInvoicePayloadOrderId(input.invoicePayload)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_id, transaction_id, guest_name, user_id, note")
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
    .select("id, product_title, seller_id, price, quantity, products:product_id(title, download_link, file_url)")
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

  // Send seller notifications for newly paid Telegram orders (non-blocking).
  try {
    if (items && items.length > 0) {
      const whatsappService = new WhatsAppService()

      let totalIdrSubtotal = 0
      const parsedNote = typeof order.note === "string" ? JSON.parse(order.note) : order.note
      if (parsedNote?.pricing?.idrSubtotal) {
        totalIdrSubtotal = Number(parsedNote.pricing.idrSubtotal) || 0
      }

      const totalStarsBase = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0)
      const sellerIds = [...new Set(items.map((item) => item.seller_id).filter(Boolean))]

      for (const sellerId of sellerIds) {
        const sellerItems = items.filter((item) => item.seller_id === sellerId)
        const productTitle = sellerItems.map((item) => item.product_title || "Product").join(", ")
        const totalQuantity = sellerItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        const sellerStarsBase = sellerItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0)
        const estimatedIdrAmount = totalIdrSubtotal > 0 && totalStarsBase > 0
          ? Math.round((sellerStarsBase / totalStarsBase) * totalIdrSubtotal)
          : sellerStarsBase

        await whatsappService.sendOrderNotification(sellerId, {
          orderNumber: order.order_number,
          productTitle,
          amount: estimatedIdrAmount,
          buyerName: order.guest_name || undefined,
          quantity: totalQuantity,
          paymentStatus: "paid",
        })
      }
    }
  } catch (notificationError) {
    console.error("[TELEGRAM ORDER] Failed to send seller WhatsApp notifications:", notificationError)
  }

  return {
    alreadyProcessed: false,
    orderId: order.id,
    orderNumber: order.order_number,
    deliveryItems,
  }
}
