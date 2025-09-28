import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

function isRateLimited(ip: string): boolean {
  const attempt = loginAttempts.get(ip)
  if (!attempt) return false
  
  const timeSinceLastAttempt = Date.now() - attempt.lastAttempt
  return attempt.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION
}

function recordLoginAttempt(ip: string, success: boolean) {
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
  
  if (success) {
    loginAttempts.delete(ip)
  } else {
    attempt.count += 1
    attempt.lastAttempt = Date.now()
    loginAttempts.set(ip, attempt)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'

    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      recordLoginAttempt(ip, false)
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      )
    }

    // Get admin credentials from environment variables
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    // Validate environment variables are set
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Konfigurasi admin tidak lengkap' },
        { status: 500 }
      )
    }

    // Verify credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      recordLoginAttempt(ip, true)

      // Create secure response with HTTP-only cookie
      const response = NextResponse.json(
        {
          success: true,
          message: 'Login admin berhasil!'
        },
        { status: 200 }
      )

      // Set secure HTTP-only cookie for admin authentication
      response.cookies.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      })

      return response
    } else {
      recordLoginAttempt(ip, false)
      return NextResponse.json(
        { error: 'Email atau password admin salah' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Create response for logout
    const response = NextResponse.json(
      { success: true, message: 'Logout berhasil' },
      { status: 200 }
    )

    // Clear admin authentication cookie
    response.cookies.set('admin-auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
} 