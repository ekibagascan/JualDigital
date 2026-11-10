import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase-service'

const BUCKETS = ['avatars', 'files', 'products'] as const

async function removeOwnedFiles(supabase: SupabaseClient, userId: string) {
  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit: 1000,
      search: userId,
    })
    if (error || !data?.length) continue
    const names = data
      .map((file) => file.name)
      .filter((name) => name.startsWith(userId))
    if (names.length === 0) continue
    await supabase.storage.from(bucket).remove(names)
  }
}

export async function deleteUserAccount(userId: string) {
  const supabase = createServiceRoleClient()

  await removeOwnedFiles(supabase, userId)

  const { error: prepareError } = await supabase.rpc('prepare_account_deletion', {
    target: userId,
  })
  if (prepareError) {
    throw new Error(prepareError.message)
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteError) {
    throw new Error(deleteError.message)
  }
}
