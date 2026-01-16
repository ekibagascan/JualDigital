import { SupabaseClient } from '@supabase/supabase-js'

export interface PaymentSettings {
  fiatEnabled: boolean
  fiatMethod: 'midtrans' | 'manual'
  cryptoEnabled: boolean
  defaultMethod: 'crypto' | 'fiat'
}

/**
 * Get payment settings from database
 * @param supabase Supabase client instance
 * @returns Payment settings with fiat and crypto options
 */
export async function getPaymentSettings(
  supabase: SupabaseClient
): Promise<PaymentSettings> {
  try {
    // Get all payment-related settings
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'payment_fiat_enabled',
        'payment_fiat_method',
        'payment_crypto_enabled',
        'payment_default_method'
      ])

    if (error && error.code !== 'PGRST116') {
      console.error('[SETTINGS] Error fetching payment settings:', error)
    }

    const settingsMap = new Map(
      (data || []).map(item => [item.key, item.value])
    )

    return {
      fiatEnabled: settingsMap.get('payment_fiat_enabled') === 'true' || settingsMap.get('payment_fiat_enabled') === true,
      fiatMethod: (settingsMap.get('payment_fiat_method') as 'midtrans' | 'manual') || 'midtrans',
      cryptoEnabled: settingsMap.get('payment_crypto_enabled') === 'true' || settingsMap.get('payment_crypto_enabled') === true || !settingsMap.has('payment_crypto_enabled'), // Default to true
      defaultMethod: (settingsMap.get('payment_default_method') as 'crypto' | 'fiat') || 'crypto', // Default to crypto
    }
  } catch (error) {
    console.error('[SETTINGS] Error in getPaymentSettings:', error)
    // Default settings: crypto enabled and default
    return {
      fiatEnabled: true,
      fiatMethod: 'midtrans',
      cryptoEnabled: true,
      defaultMethod: 'crypto',
    }
  }
}

/**
 * Get payment method setting (legacy - for backward compatibility)
 * @param supabase Supabase client instance
 * @returns Payment method: 'midtrans' or 'manual'
 * @deprecated Use getPaymentSettings instead
 */
export async function getPaymentMethodSetting(
  supabase: SupabaseClient
): Promise<'midtrans' | 'manual'> {
  const settings = await getPaymentSettings(supabase)
  return settings.fiatMethod
}

