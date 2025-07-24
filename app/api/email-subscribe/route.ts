import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email tidak valid' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Insert email into database
    const { error } = await supabase
      .from('email_subscribers')
      .insert([
        {
          email: email.toLowerCase().trim(),
          status: 'active'
        }
      ])

    if (error) {
      // Handle duplicate email error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 409 }
        )
      }
      
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Gagal mendaftar email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email berhasil didaftarkan!'
    })

  } catch (error) {
    console.error('Email subscribe error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
} 