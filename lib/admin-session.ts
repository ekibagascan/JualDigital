import { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin-auth'
const MAX_AGE_SEC = 60 * 60 * 24 // 24 hours

/**
 * Web Crypto HMAC — works in both Edge middleware and Node API routes.
 * Node's `crypto.createHmac` breaks Next.js Edge middleware and causes
 * successful logins to bounce back to /admin/login.
 */
function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'jualdigital-admin-dev-secret'
  )
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i])
  }
  // btoa is available in Edge and modern Node
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return toBase64Url(sig)
}

/** Create a signed admin session token (not the literal string "authenticated"). */
export async function createAdminSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC
  const payload = `admin:${exp}`
  return `${payload}.${await sign(payload)}`
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  if (!payload.startsWith('admin:')) return false

  try {
    const key = await getHmacKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sig),
      new TextEncoder().encode(payload)
    )
    if (!valid) return false
  } catch {
    return false
  }

  const exp = parseInt(payload.split(':')[1] || '0', 10)
  if (!exp || Date.now() / 1000 > exp) return false
  return true
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  return verifyAdminSessionToken(req.cookies.get(COOKIE_NAME)?.value)
}

export const ADMIN_COOKIE = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SEC,
} as const
