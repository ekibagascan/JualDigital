import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getTelegramProductStarsPrice,
  isTelegramCheckoutProduct,
  type TelegramCheckoutProductLike,
} from "@/lib/telegram-checkout"

export const dynamic = "force-dynamic"

function getProductIdFromPayload(payload: string): string {
  // Expected format from website deep link: buy_p_<productId>
  if (!payload.startsWith("buy_p_")) {
    throw new Error("Invalid start payload format")
  }
  const id = payload.replace("buy_p_", "")
  if (!id) throw new Error("Invalid product payload")
  return id
}

export async function GET(req: NextRequest) {
  try {
    const payload = req.nextUrl.searchParams.get("payload")
    if (!payload) {
      return NextResponse.json({ error: "payload query parameter is required" }, { status: 400 })
    }

    const productId = getProductIdFromPayload(payload)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: product, error } = await supabase
      .from("products")
      .select("id, title, description, price, tags, delivery_method, telegram_enabled, telegram_stars_price")
      .eq("id", productId)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (!isTelegramCheckoutProduct(product as TelegramCheckoutProductLike)) {
      return NextResponse.json({ error: "Product is not available for Telegram checkout" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        title: product.title,
        description: product.description || product.title,
        starsAmount: getTelegramProductStarsPrice(product as TelegramCheckoutProductLike, product.price),
        currency: "XTR",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch telegram product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
