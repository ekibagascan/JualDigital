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

    // Get settings from database (using a simple key-value approach)
    // If settings table doesn't exist, we'll use a JSONB column in a settings row
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'payment_method')
      .single()

    // Always return 'manual' - Doku has been removed
    const defaultPaymentMethod = 'manual'

    if (error && error.code !== 'PGRST116') {
      console.error('[SETTINGS API] Error fetching settings:', error)
      return NextResponse.json(
        { payment_method: defaultPaymentMethod },
        { status: 200 }
      )
    }

    return NextResponse.json({
      payment_method: defaultPaymentMethod, // Always manual
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
    const { payment_method } = body

    // Only allow manual payment - Doku has been removed
    if (payment_method && payment_method !== 'manual') {
      return NextResponse.json(
        { error: 'Invalid payment_method. Only "manual" is supported (Doku has been removed)' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upsert settings (insert or update) - always set to manual
    const { data, error } = await supabase
      .from('settings')
      .upsert(
        {
          key: 'payment_method',
          value: 'manual',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'key',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[SETTINGS API] Error saving settings:', error)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payment_method: 'manual',
    })
  } catch (error) {
    console.error('[SETTINGS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

