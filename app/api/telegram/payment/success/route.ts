import { NextRequest, NextResponse } from "next/server"
import { finalizeTelegramPayment } from "@/lib/telegram-order-service"

export const dynamic = "force-dynamic"

function isAuthorizedWebhook(req: NextRequest): boolean {
  const configured = process.env.TELEGRAM_BOT_WEBHOOK_SECRET
  if (!configured) return true
  const incoming = req.headers.get("x-telegram-bot-api-secret-token")
  return incoming === configured
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

    const body = await req.json()
    const invoicePayload = body?.invoicePayload as string | undefined
    const telegramPaymentChargeId = body?.telegramPaymentChargeId as string | undefined
    const providerPaymentChargeId = body?.providerPaymentChargeId as string | undefined
    const telegramUserId = body?.telegramUserId as string | undefined
    const starsAmount = body?.starsAmount as number | undefined

    if (!invoicePayload || !telegramPaymentChargeId) {
      return NextResponse.json(
        { error: "invoicePayload and telegramPaymentChargeId are required" },
        { status: 400 },
      )
    }

    const data = await finalizeTelegramPayment({
      invoicePayload,
      telegramPaymentChargeId,
      providerPaymentChargeId,
      telegramUserId,
      starsAmount,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process telegram payment"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
