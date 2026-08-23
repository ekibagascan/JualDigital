import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = serviceRoleClient()
    const productId = params.productId

    let userTierSort = -1
    let isSeller = false
    let subscription = null

    if (user) {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .maybeSingle()
      isSeller = product?.seller_id === user.id

      if (!isSeller) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, membership_tiers:tier_id (id, name, sort_order)')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .eq('status', 'active')
          .maybeSingle()

        subscription = sub
        if (sub) {
          const now = new Date()
          const periodEnd = new Date(sub.current_period_end)
          if (periodEnd >= now) {
            const tier = sub.membership_tiers as { sort_order?: number } | null
            userTierSort = tier?.sort_order ?? 0
          }
        }
      } else {
        userTierSort = 9999
      }
    }

    const { data: posts, error } = await supabase
      .from('membership_posts')
      .select('*')
      .eq('product_id', productId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[MEMBERSHIP FEED]', error)
      return NextResponse.json({ error: 'Gagal memuat feed komunitas' }, { status: 500 })
    }

    const visible = (posts || []).map((post) => {
      const canView =
        isSeller ||
        post.is_public_teaser ||
        userTierSort >= (post.min_tier_sort_order ?? 0)

      if (canView) return { ...post, locked: false }

      return {
        id: post.id,
        title: post.title,
        published_at: post.published_at,
        min_tier_sort_order: post.min_tier_sort_order,
        is_public_teaser: post.is_public_teaser,
        locked: true,
        body: null,
        media_path: null,
      }
    })

    return NextResponse.json({
      posts: visible,
      subscription,
      is_seller: isSeller,
      has_access: isSeller || userTierSort >= 0,
    })
  } catch (error) {
    console.error('[MEMBERSHIP FEED] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat feed komunitas' }, { status: 500 })
  }
}
