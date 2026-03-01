import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { finalizeTelegramPayment } from "@/lib/telegram-order-service"

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

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

    const update = await req.json()

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

      await finalizeTelegramPayment({
        invoicePayload,
        telegramPaymentChargeId,
        providerPaymentChargeId,
        telegramUserId,
        starsAmount,
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, ignored: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram webhook processing error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
