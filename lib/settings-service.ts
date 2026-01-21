import { SupabaseClient } from '@supabase/supabase-js'

export interface PaymentSettings {
  fiatEnabled: boolean
  fiatMethod: 'dana' | 'manual'
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
      fiatMethod: (settingsMap.get('payment_fiat_method') as 'dana' | 'manual') || 'dana',
      cryptoEnabled: settingsMap.get('payment_crypto_enabled') === 'true' || settingsMap.get('payment_crypto_enabled') === true, // Only true if explicitly set
      defaultMethod: (settingsMap.get('payment_default_method') as 'crypto' | 'fiat') || 'fiat', // Default to fiat
    }
  } catch (error) {
    console.error('[SETTINGS] Error in getPaymentSettings:', error)
    // Default settings: fiat enabled, crypto disabled
    return {
      fiatEnabled: true,
      fiatMethod: 'dana',
      cryptoEnabled: false, // Disable crypto by default
      defaultMethod: 'fiat',
    }
  }
}

/**
 * Get payment method setting (legacy - for backward compatibility)
 * @param supabase Supabase client instance
 * @returns Payment method: 'dana' or 'manual'
 * @deprecated Use getPaymentSettings instead
 */
export async function getPaymentMethodSetting(
  supabase: SupabaseClient
): Promise<'dana' | 'manual'> {
  const settings = await getPaymentSettings(supabase)
  return settings.fiatMethod
}

