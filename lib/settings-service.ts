import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get payment method setting from database
 * @param supabase Supabase client instance
 * @returns Payment method: 'midtrans' or 'manual'
 */
export async function getPaymentMethodSetting(
  supabase: SupabaseClient
): Promise<'midtrans' | 'manual'> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_method')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[SETTINGS] Error fetching payment method:', error)
      // Default to midtrans if error
      return 'midtrans'
    }

    const paymentMethod = data?.value as 'midtrans' | 'manual' | undefined
    
    // Validate and default to midtrans
    if (paymentMethod === 'midtrans' || paymentMethod === 'manual') {
      return paymentMethod
    }

    // Default to midtrans
    return 'midtrans'
  } catch (error) {
    console.error('[SETTINGS] Error in getPaymentMethodSetting:', error)
    // Default to midtrans on error
    return 'midtrans'
  }
}

