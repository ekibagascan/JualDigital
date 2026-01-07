import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get payment method setting from database
 * @param supabase Supabase client instance
 * @returns 'doku' or 'manual' (defaults to 'doku' if not set)
 */
export async function getPaymentMethodSetting(
  supabase: SupabaseClient
): Promise<'doku' | 'manual'> {
  try {
    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_method')
      .single()

    if (error || !setting) {
      // Default to 'doku' if setting not found
      console.log('[SETTINGS] Payment method setting not found, defaulting to "doku"')
      return 'doku'
    }

    const method = setting.value === 'manual' ? 'manual' : 'doku'
    console.log('[SETTINGS] Payment method:', method)
    return method
  } catch (error) {
    console.error('[SETTINGS] Error fetching payment method setting:', error)
    // Default to 'doku' on error
    return 'doku'
  }
}

