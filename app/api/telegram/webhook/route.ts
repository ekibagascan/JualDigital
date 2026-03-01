import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { finalizeTelegramPayment, initTelegramOrder } from "@/lib/telegram-order-service"

export const dynamic = "force-dynamic"

function isAuthorizedWebhook(req: NextRequest): boolean {
  const configured = process.env.TELEGRAM_BOT_WEBHOOK_SECRET
  if (!configured) return true
  const incoming = req.headers.get("x-telegram-bot-api-secret-token")
  return incoming === configured
}

async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured")

  const response = await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      error_message: ok ? undefined : (errorMessage || "Order validation failed"),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to answer pre-checkout query: ${text}`)
  }
}

async function validatePendingInvoicePayload(invoicePayload: string) {
  const parts = invoicePayload.split(":")
  if (parts.length < 2 || parts[0] !== "tgstars") {
    throw new Error("Invalid invoice payload")
  }
  const orderId = parts[1]

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single()

  if (error || !order) {
    throw new Error("Order not found")
  }
  if (order.status === "paid") {
    throw new Error("Order already paid")
  }
}

async function callTelegramApi(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured")

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Telegram API ${method} failed: ${text}`)
  }
}

async function sendTelegramMessage(chatId: string | number, text: string) {
  await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
  })
}

function formatIdr(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`
}

function parseStartPayload(payload: string): { productId: string; quantity: number } | null {
  const match = payload.match(/^buy_p_(.+?)(?:_q(\d+))?$/)
  if (!match) return null
  const productId = match[1]
  const quantity = match[2] ? Math.max(1, Math.min(parseInt(match[2], 10), 10)) : 1
  return { productId, quantity }
}

async function sendTelegramStarsInvoice(params: {
  chatId: string | number
  title: string
  description: string
  invoicePayload: string
  starsAmount: number
  starsSubtotalBase: number
  adminFeeStars: number
  adminFeePercent: number
  idrSubtotal: number
  idrPerStar: number
  quantity: number
}) {
  await callTelegramApi("sendInvoice", {
    chat_id: params.chatId,
    title: params.title,
    description: [
      params.description,
      `Jumlah: ${params.quantity}`,
      `Harga dasar: ${params.starsSubtotalBase} Stars`,
      `Biaya admin ${params.adminFeePercent}%: +${params.adminFeeStars} Stars`,
      `Total bayar: ${params.starsAmount} Stars`,
      `Perkiraan nilai: Rp ${params.idrSubtotal.toLocaleString("id-ID")} (rate 1 Star ~= Rp ${params.idrPerStar.toLocaleString("id-ID")})`,
    ].join("\n"),
    payload: params.invoicePayload,
    currency: "XTR",
    prices: [
      {
        label: `${params.title} x${params.quantity}`,
        amount: params.starsAmount,
      },
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

    const update = await req.json()

    const messageText = update?.message?.text as string | undefined
    const chatId = update?.message?.chat?.id as string | number | undefined
    const telegramUserId = update?.message?.from?.id ? String(update.message.from.id) : undefined

    // 0) Handle /start command and deep-link payload.
    if (messageText && messageText.startsWith("/start") && chatId && telegramUserId) {
      const payload = messageText.split(" ")[1]

      if (!payload) {
        await sendTelegramMessage(
          chatId,
          "Selamat datang di JualDigital Bot.\n\nUntuk checkout Telegram, silakan klik tombol 'Checkout via Telegram' dari website agar produk dan jumlah otomatis terbawa.",
        )
        return NextResponse.json({ ok: true })
      }

      const parsed = parseStartPayload(payload)
      if (!parsed) {
        await sendTelegramMessage(
          chatId,
          "Link checkout tidak valid. Silakan kembali ke website dan klik tombol checkout Telegram lagi.",
        )
        return NextResponse.json({ ok: true })
      }

      try {
        const order = await initTelegramOrder({
          productId: parsed.productId,
          telegramUserId,
          telegramChatId: String(chatId),
          quantity: parsed.quantity,
        })

        const receiptText = [
          "INVOICE CHECKOUT TELEGRAM",
          "",
          `Order: ${order.orderNumber}`,
          `Produk: ${order.title}`,
          `Jumlah: ${order.quantity}`,
          "",
          "Rincian Pembayaran:",
          `- Harga produk: ${formatIdr(order.idrUnitPrice)} x ${order.quantity} = ${formatIdr(order.idrSubtotal)}`,
          `- Konversi: 1 Star ~= ${formatIdr(order.idrPerStar)}`,
          `- Stars dasar: ${order.starsSubtotalBase}`,
          `- Biaya admin ${order.adminFeePercent}%: +${order.adminFeeStars} Stars`,
          "------------------------------",
          `Total bayar: ${order.starsAmount} Stars`,
          "",
          "Lanjutkan pembayaran dengan tombol di bawah.",
        ].join("\n")

        await sendTelegramMessage(chatId, receiptText)

        await sendTelegramStarsInvoice({
          chatId,
          title: order.title,
          description: order.description,
          invoicePayload: order.invoicePayload,
          starsAmount: order.starsAmount,
          starsSubtotalBase: order.starsSubtotalBase,
          adminFeeStars: order.adminFeeStars,
          adminFeePercent: order.adminFeePercent,
          idrSubtotal: order.idrSubtotal,
          idrPerStar: order.idrPerStar,
          quantity: order.quantity,
        })
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Gagal memulai checkout Telegram."
        await sendTelegramMessage(chatId, `Checkout gagal: ${errMsg}`)
      }

      return NextResponse.json({ ok: true })
    }

    // 1) Validate invoice before Telegram confirms payment.
    if (update?.pre_checkout_query?.id) {
      const preCheckoutQueryId = update.pre_checkout_query.id as string
      const invoicePayload = update.pre_checkout_query.invoice_payload as string

      try {
        await validatePendingInvoicePayload(invoicePayload)
        await answerPreCheckoutQuery(preCheckoutQueryId, true)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Order validation failed"
        await answerPreCheckoutQuery(preCheckoutQueryId, false, message)
      }

      return NextResponse.json({ ok: true })
    }

    // 2) Finalize payment after Telegram sends successful_payment update.
    const successfulPayment = update?.message?.successful_payment
    if (successfulPayment) {
      const invoicePayload = successfulPayment.invoice_payload as string
      const telegramPaymentChargeId = successfulPayment.telegram_payment_charge_id as string
      const providerPaymentChargeId = successfulPayment.provider_payment_charge_id as string | undefined
      const starsAmount = successfulPayment.total_amount as number | undefined
      const telegramUserId = String(update?.message?.from?.id || "")

      const result = await finalizeTelegramPayment({
        invoicePayload,
        telegramPaymentChargeId,
        providerPaymentChargeId,
        telegramUserId,
        starsAmount,
      })

      const deliveryText = result.deliveryItems.length > 0
        ? result.deliveryItems
          .map((item, idx) => `${idx + 1}. ${item.title}\n${item.downloadUrl || "Link belum tersedia, tim kami akan kirim manual."}`)
          .join("\n\n")
        : "Pembayaran berhasil. Produk sedang diproses oleh seller."

      if (update?.message?.chat?.id) {
        await sendTelegramMessage(
          update.message.chat.id,
          `Pembayaran berhasil untuk order ${result.orderNumber}.\n\n${deliveryText}`,
        )
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, ignored: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram webhook processing error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
