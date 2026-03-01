import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // no-op
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const enabled = !!body?.enabled

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, telegram_feature_enabled")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "seller") {
      return NextResponse.json({ error: "Seller access required" }, { status: 403 })
    }

    if (enabled && !profile.telegram_feature_enabled) {
      return NextResponse.json(
        { error: "Telegram checkout feature is not enabled for your seller account. Please contact admin." },
        { status: 403 }
      )
    }

    const updatePayload: { telegram_enabled: boolean; telegram_plan_code?: null; telegram_stars_price?: null } = {
      telegram_enabled: enabled,
    }
    if (!enabled) {
      updatePayload.telegram_plan_code = null
      updatePayload.telegram_stars_price = null
    }

    const { data: product, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .select("id, telegram_enabled")
      .single()

    if (error || !product) {
      return NextResponse.json({ error: "Failed to update Telegram setting" }, { status: 500 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error("Error in POST /api/seller/products/[id]/telegram:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
