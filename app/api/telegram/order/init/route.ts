import { NextRequest, NextResponse } from "next/server"
import { initTelegramOrder } from "@/lib/telegram-order-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const productId = body?.productId as string | undefined
    const telegramUserId = body?.telegramUserId as string | undefined
    const telegramChatId = body?.telegramChatId as string | undefined
    const quantity = body?.quantity as number | undefined

    if (!productId || !telegramUserId) {
      return NextResponse.json(
        { error: "productId and telegramUserId are required" },
        { status: 400 },
      )
    }

    const data = await initTelegramOrder({
      productId,
      telegramUserId,
      telegramChatId,
      quantity,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize telegram order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
