import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getTelegramPricingBreakdown,
  isTelegramCheckoutProduct,
  type TelegramCheckoutProductLike,
} from "@/lib/telegram-checkout"

export const dynamic = "force-dynamic"

function getProductRequestFromPayload(payload: string): { productId: string; quantity: number } {
  // Supported formats:
  // - buy_p_<productId>
  // - buy_p_<productId>_q<quantity>
  const match = payload.match(/^buy_p_(.+?)(?:_q(\d+))?$/)
  if (!match) throw new Error("Invalid start payload format")

  const productId = match[1]
  const quantity = match[2] ? Math.max(1, Math.min(parseInt(match[2], 10), 10)) : 1
  if (!productId) throw new Error("Invalid product payload")
  return { productId, quantity }
}

function formatIdr(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`
}

export async function GET(req: NextRequest) {
  try {
    const payload = req.nextUrl.searchParams.get("payload")
    if (!payload) {
      return NextResponse.json({ error: "payload query parameter is required" }, { status: 400 })
    }

    const { productId, quantity } = getProductRequestFromPayload(payload)
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

    const pricing = getTelegramPricingBreakdown({
      product: product as TelegramCheckoutProductLike,
      fallbackIdrPrice: product.price,
      quantity,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        title: product.title,
        description: product.description || product.title,
        quantity: pricing.quantity,
        starsUnitBase: pricing.starsUnitBase,
        starsSubtotalBase: pricing.starsSubtotalBase,
        adminFeePercent: pricing.adminFeePercent,
        adminFeeStars: pricing.adminFeeStars,
        starsAmount: pricing.totalStars,
        idrUnitPrice: pricing.idrUnitPrice,
        idrSubtotal: pricing.idrSubtotal,
        idrPerStar: pricing.idrPerStar,
        transparentConversionText: [
          `${formatIdr(pricing.idrUnitPrice)} x ${pricing.quantity} = ${formatIdr(pricing.idrSubtotal)}`,
          `Konversi: 1 Star ~= ${formatIdr(pricing.idrPerStar)}`,
          `Stars dasar: ${pricing.starsSubtotalBase}`,
          `Biaya admin ${pricing.adminFeePercent}%: +${pricing.adminFeeStars} Stars`,
          `Total bayar: ${pricing.totalStars} Stars`,
        ].join("\n"),
        currency: "XTR",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch telegram product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
