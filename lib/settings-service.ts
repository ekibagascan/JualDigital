import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get payment method setting from database
 * @param supabase Supabase client instance
 * @returns Always returns 'manual' (Doku removed)
 */
export async function getPaymentMethodSetting(
  supabase: SupabaseClient
): Promise<'manual'> {
  // Always return manual payment - Doku has been removed
  return 'manual'
}

