import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'
import {
  insertReport,
  isMissingRelation,
  isUuid,
  notifyModerationReport,
  targetExists,
} from '@/lib/moderation'

const STORAGE_ERROR = {
  error: 'Moderasi belum siap. Jalankan SQL migrasi di Supabase.',
  code: 'moderation_storage_missing',
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const blockedUserId = pickBody<string>(body, 'blocked_user_id', 'blockedUserId')?.trim()
    const detailsRaw = pickBody<string>(body, 'details')
    const details = typeof detailsRaw === 'string' ? detailsRaw.trim().slice(0, 2000) : ''

    if (!blockedUserId || !isUuid(blockedUserId)) {
      return NextResponse.json({ error: 'blocked_user_id tidak valid' }, { status: 400 })
    }
    if (blockedUserId === user.id) {
      return NextResponse.json({ error: 'Kamu tidak bisa memblokir akunmu sendiri' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const exists = await targetExists(supabase, 'user', blockedUserId)
    if (!exists) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    const { data: block, error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_user_id: blockedUserId })
      .select('id, blocker_id, blocked_user_id, created_at')
      .single()

    if (error || !block) {
      if (isMissingRelation(error, 'user_blocks')) {
        return NextResponse.json(STORAGE_ERROR, { status: 503 })
      }
      if (error?.code === '23505') {
        const { data: existing } = await supabase
          .from('user_blocks')
          .select('id, blocker_id, blocked_user_id, created_at')
          .eq('blocker_id', user.id)
          .eq('blocked_user_id', blockedUserId)
          .maybeSingle()
        return NextResponse.json(
          { error: 'Pengguna sudah diblokir', block: existing, code: 'already_blocked' },
          { status: 409 }
        )
      }
      console.error('[MODERATION BLOCK]', error)
      return NextResponse.json({ error: 'Gagal memblokir pengguna' }, { status: 500 })
    }

    const reason = 'user_blocked'
    const { data: report, error: reportError } = await insertReport(supabase, {
      reporterId: user.id,
      targetType: 'user',
      targetId: blockedUserId,
      reason,
      details: details || 'Pengguna diblokir dari aplikasi.',
      source: 'block',
    })

    if (reportError) {
      console.error('[MODERATION BLOCK] report insert failed:', reportError)
    }

    let notified = false
    if (report) {
      notified = await notifyModerationReport({
        reportId: report.id,
        targetType: 'user',
        targetId: blockedUserId,
        reason,
        details: details || 'Pengguna diblokir dari aplikasi.',
        reporterId: user.id,
        source: 'block',
      })
    }

    return NextResponse.json({
      success: true,
      block,
      report_id: report?.id ?? null,
      notified,
    })
  } catch (error) {
    console.error('[MODERATION BLOCK]', error)
    return NextResponse.json({ error: 'Gagal memblokir pengguna' }, { status: 500 })
  }
}
