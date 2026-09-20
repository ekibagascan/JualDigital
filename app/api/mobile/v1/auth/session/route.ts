import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { mapSellerStatusForMobile, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const accessToken =
      (typeof body.access_token === 'string' && body.access_token.trim()) ||
      (typeof body.accessToken === 'string' && body.accessToken.trim()) ||
      ''

    if (!accessToken) {
      return NextResponse.json(
        { error: 'access_token wajib diisi' },
        { status: 400 }
      )
    }

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: authError } = await anon.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Token tidak valid atau sudah kedaluwarsa' },
        { status: 401 }
      )
    }

    const user = authData.user
    const supabase = serviceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, shop_logo, business_name, phone, bio, role, status, created_at')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? null,
        name: profile?.name ?? user.user_metadata?.name ?? null,
        avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        phone: profile?.phone ?? null,
        bio: profile?.bio ?? null,
        business_name: profile?.business_name ?? null,
        shop_logo: profile?.shop_logo ?? null,
        role,
        seller_status: mapSellerStatusForMobile(profile),
        is_seller: role === 'seller' || role === 'admin',
        created_at: profile?.created_at ?? user.created_at,
      },
    })
  } catch (error) {
    console.error('[MOBILE AUTH SESSION] Error:', error)
    return NextResponse.json({ error: 'Gagal memvalidasi sesi' }, { status: 500 })
  }
}
