import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'
import { isMissingRelation, isUuid } from '@/lib/moderation'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const id = params.id?.trim()
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'ID blokir tidak valid' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const { data: byId, error: byIdError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', id)
      .eq('blocker_id', user.id)
      .select('id')

    if (byIdError) {
      if (isMissingRelation(byIdError, 'user_blocks')) {
        return NextResponse.json(
          { error: 'Moderasi belum siap. Jalankan SQL migrasi di Supabase.', code: 'moderation_storage_missing' },
          { status: 503 }
        )
      }
      console.error('[MODERATION UNBLOCK]', byIdError)
      return NextResponse.json({ error: 'Gagal membuka blokir' }, { status: 500 })
    }

    if (byId && byId.length > 0) {
      return NextResponse.json({ success: true, id: byId[0].id })
    }

    const { data: byUser, error: byUserError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocked_user_id', id)
      .eq('blocker_id', user.id)
      .select('id')

    if (byUserError) {
      console.error('[MODERATION UNBLOCK]', byUserError)
      return NextResponse.json({ error: 'Gagal membuka blokir' }, { status: 500 })
    }

    if (!byUser || byUser.length === 0) {
      return NextResponse.json({ error: 'Blokir tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: byUser[0].id })
  } catch (error) {
    console.error('[MODERATION UNBLOCK]', error)
    return NextResponse.json({ error: 'Gagal membuka blokir' }, { status: 500 })
  }
}
