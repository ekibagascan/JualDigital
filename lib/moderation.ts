import type { SupabaseClient } from '@supabase/supabase-js'
import { serviceRoleClient } from '@/lib/mobile-auth'
import { sendModerationAlert } from '@/lib/email-service'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const REPORT_TARGET_TYPES = ['product', 'review', 'post', 'user'] as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function isMissingRelation(
  error: { message?: string; code?: string } | null | undefined,
  relation: string
): boolean {
  if (!error) return false
  const message = error.message || ''
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return relation ? new RegExp(relation, 'i').test(message) || /schema cache|does not exist/i.test(message) : true
  }
  return new RegExp(relation, 'i').test(message) && /does not exist|schema cache|could not find/i.test(message)
}

export async function getBlockedUserIds(userId: string | null | undefined): Promise<string[]> {
  if (!userId) return []
  try {
    const supabase = serviceRoleClient()
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_user_id')
      .eq('blocker_id', userId)

    if (error) {
      if (!isMissingRelation(error, 'user_blocks')) {
        console.error('[MODERATION] Failed to load blocks:', error.message)
      }
      return []
    }

    return (data || [])
      .map((row) => row.blocked_user_id as string)
      .filter((id) => typeof id === 'string' && id.length > 0)
  } catch (error) {
    console.error('[MODERATION] Block lookup failed:', error)
    return []
  }
}

export function excludeIds<T extends { seller_id?: string | null; user_id?: string | null; author_id?: string | null }>(
  rows: T[],
  blockedIds: string[],
  field: 'seller_id' | 'user_id' | 'author_id'
): T[] {
  if (!blockedIds.length) return rows
  const blocked = new Set(blockedIds)
  return rows.filter((row) => {
    const id = row[field]
    return !id || !blocked.has(id)
  })
}

type ReportInput = {
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: string
  details?: string | null
  source: 'report' | 'block'
}

export async function insertReport(supabase: SupabaseClient, input: ReportInput) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason.slice(0, 200),
      details: input.details ? input.details.slice(0, 2000) : null,
      source: input.source,
      status: 'open',
    })
    .select('id, target_type, target_id, reason, status, created_at')
    .single()

  return { data, error }
}

export async function notifyModerationReport(input: {
  reportId: string
  targetType: string
  targetId: string
  reason: string
  details?: string | null
  reporterId: string
  source: 'report' | 'block'
}): Promise<boolean> {
  try {
    return await sendModerationAlert(input)
  } catch (error) {
    console.error('[MODERATION] Email notification failed:', error)
    return false
  }
}

export async function targetExists(
  supabase: SupabaseClient,
  targetType: ReportTargetType,
  targetId: string
): Promise<boolean> {
  const table =
    targetType === 'product'
      ? 'products'
      : targetType === 'review'
        ? 'reviews'
        : targetType === 'post'
          ? 'membership_posts'
          : 'profiles'

  const { data, error } = await supabase.from(table).select('id').eq('id', targetId).maybeSingle()
  if (error) {
    console.error('[MODERATION] Target lookup failed:', error.message)
    return false
  }
  return !!data
}
