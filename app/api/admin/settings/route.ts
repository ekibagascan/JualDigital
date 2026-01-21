import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET settings
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all payment-related settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'payment_method',
        'payment_fiat_enabled',
        'payment_fiat_method',
        'payment_crypto_enabled',
        'payment_default_method'
      ])

    if (error && error.code !== 'PGRST116') {
      console.error('[SETTINGS API] Error fetching settings:', error)
    }

    const settingsMap = new Map(
      (settings || []).map(item => [item.key, item.value])
    )

    // Legacy support: if only old payment_method exists, migrate it
    // Convert old 'midtrans' to 'dana' for backward compatibility
    const legacyPaymentMethod = settingsMap.get('payment_method') as 'midtrans' | 'dana' | 'manual' | undefined
    const migratedMethod = legacyPaymentMethod === 'midtrans' ? 'dana' : (legacyPaymentMethod || 'dana')

    return NextResponse.json({
      payment_method: migratedMethod, // Legacy support
      payment_fiat_enabled: settingsMap.get('payment_fiat_enabled') !== 'false' && settingsMap.get('payment_fiat_enabled') !== false,
      payment_fiat_method: settingsMap.get('payment_fiat_method') || migratedMethod,
      payment_crypto_enabled: settingsMap.get('payment_crypto_enabled') !== 'false' && settingsMap.get('payment_crypto_enabled') !== false,
      payment_default_method: settingsMap.get('payment_default_method') || 'fiat',
    })
  } catch (error) {
    console.error('[SETTINGS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT settings
export async function PUT(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      payment_method, // Legacy support
      payment_fiat_enabled,
      payment_fiat_method,
      payment_crypto_enabled,
      payment_default_method,
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prepare settings to save
    const settingsToSave = []

    // Legacy support: if payment_method is provided, use it for fiat_method
    // Convert old 'midtrans' to 'dana' for backward compatibility
    if (payment_method) {
      const normalizedMethod = payment_method === 'midtrans' ? 'dana' : payment_method
      if (normalizedMethod !== 'dana' && normalizedMethod !== 'manual') {
        return NextResponse.json(
          { error: 'Invalid payment_method. Must be "dana" or "manual"' },
          { status: 400 }
        )
      }
      settingsToSave.push({
        key: 'payment_method',
        value: normalizedMethod,
        updated_at: new Date().toISOString(),
      })
      // Also set fiat_method if not explicitly provided
      if (payment_fiat_method === undefined) {
        settingsToSave.push({
          key: 'payment_fiat_method',
          value: normalizedMethod,
          updated_at: new Date().toISOString(),
        })
      }
    }

    // Save new payment settings
    if (payment_fiat_enabled !== undefined) {
      settingsToSave.push({
        key: 'payment_fiat_enabled',
        value: payment_fiat_enabled === true || payment_fiat_enabled === 'true',
        updated_at: new Date().toISOString(),
      })
    }

    if (payment_fiat_method) {
      // Convert old 'midtrans' to 'dana' for backward compatibility
      const normalizedMethod = payment_fiat_method === 'midtrans' ? 'dana' : payment_fiat_method
      if (normalizedMethod !== 'dana' && normalizedMethod !== 'manual') {
        return NextResponse.json(
          { error: 'Invalid payment_fiat_method. Must be "dana" or "manual"' },
          { status: 400 }
        )
      }
      settingsToSave.push({
        key: 'payment_fiat_method',
        value: normalizedMethod,
        updated_at: new Date().toISOString(),
      })
    }

    if (payment_crypto_enabled !== undefined) {
      settingsToSave.push({
        key: 'payment_crypto_enabled',
        value: payment_crypto_enabled === true || payment_crypto_enabled === 'true',
        updated_at: new Date().toISOString(),
      })
    }

    if (payment_default_method) {
      if (payment_default_method !== 'crypto' && payment_default_method !== 'fiat') {
        return NextResponse.json(
          { error: 'Invalid payment_default_method. Must be "crypto" or "fiat"' },
          { status: 400 }
        )
      }
      settingsToSave.push({
        key: 'payment_default_method',
        value: payment_default_method,
        updated_at: new Date().toISOString(),
      })
    }

    // Upsert all settings
    if (settingsToSave.length > 0) {
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert(settingsToSave, {
          onConflict: 'key',
        })

      if (upsertError) {
        console.error('[SETTINGS API] Error saving settings:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save settings' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      payment_method: payment_method || payment_fiat_method || 'midtrans',
      payment_fiat_enabled: payment_fiat_enabled !== false,
      payment_fiat_method: payment_fiat_method || payment_method || 'midtrans',
      payment_crypto_enabled: payment_crypto_enabled !== false,
      payment_default_method: payment_default_method || 'crypto',
    })
  } catch (error) {
    console.error('[SETTINGS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

