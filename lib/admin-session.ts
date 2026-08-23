import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin-auth'
const MAX_AGE_SEC = 60 * 60 * 24 // 24 hours

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'jualdigital-admin-dev-secret'
  )
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/** Create a signed admin session token (not the literal string "authenticated"). */
export function createAdminSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC
  const payload = `admin:${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  if (!payload.startsWith('admin:')) return false

  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }

  const exp = parseInt(payload.split(':')[1] || '0', 10)
  if (!exp || Date.now() / 1000 > exp) return false
  return true
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifyAdminSessionToken(req.cookies.get(COOKIE_NAME)?.value)
}

export const ADMIN_COOKIE = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SEC,
} as const
