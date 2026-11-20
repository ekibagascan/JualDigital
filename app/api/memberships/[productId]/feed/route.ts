import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { containsProfanity } from '@/lib/content-policy'
import { getBlockedUserIds } from '@/lib/moderation'

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

    const blockedIds = user ? await getBlockedUserIds(user.id) : []
    const blocked = new Set(blockedIds)

    let postsQuery = supabase
      .from('membership_posts')
      .select('*')
      .eq('product_id', productId)
      .is('removed_at', null)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50)

    let { data: posts, error } = await postsQuery
    if (error && /removed_at/i.test(error.message || '')) {
      ;({ data: posts, error } = await supabase
        .from('membership_posts')
        .select('*')
        .eq('product_id', productId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(50))
    }

    if (error) {
      console.error('[MEMBERSHIP FEED]', error)
      return NextResponse.json({ error: 'Gagal memuat feed komunitas' }, { status: 500 })
    }

    const visible = (posts || [])
      .filter((post) => {
        if (post.removed_at) return false
        if (post.author_id && blocked.has(post.author_id)) return false
        return !containsProfanity([post.title, post.body].filter(Boolean).join('\n'))
      })
      .map((post) => {
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
