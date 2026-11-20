import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { isMissingRelation } from '@/lib/moderation'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id, blocked_user_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingRelation(error, 'user_blocks')) {
        return NextResponse.json(
          { error: 'Moderasi belum siap. Jalankan SQL migrasi di Supabase.', code: 'moderation_storage_missing' },
          { status: 503 }
        )
      }
      console.error('[MODERATION BLOCKS]', error)
      return NextResponse.json({ error: 'Gagal memuat daftar blokir' }, { status: 500 })
    }

    const blocks = data || []
    return NextResponse.json({
      blocks,
      blocked_user_ids: blocks.map((row) => row.blocked_user_id),
    })
  } catch (error) {
    console.error('[MODERATION BLOCKS]', error)
    return NextResponse.json({ error: 'Gagal memuat daftar blokir' }, { status: 500 })
  }
}
