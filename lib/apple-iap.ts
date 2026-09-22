import { createVerify, X509Certificate } from 'crypto'

export const APPLE_BUNDLE_ID = 'id.jualdigital.app'

export const APPLE_IAP_PRODUCT_IDS = [
  'id.jualdigital.app.iap.tier.10000',
  'id.jualdigital.app.iap.tier.25000',
  'id.jualdigital.app.iap.tier.50000',
  'id.jualdigital.app.iap.tier.75000',
  'id.jualdigital.app.iap.tier.100000',
  'id.jualdigital.app.iap.tier.150000',
  'id.jualdigital.app.iap.tier.200000',
  'id.jualdigital.app.iap.tier.250000',
  'id.jualdigital.app.iap.tier.350000',
  'id.jualdigital.app.iap.tier.500000',
  'id.jualdigital.app.iap.tier.750000',
  'id.jualdigital.app.iap.tier.1000000',
  'id.jualdigital.app.iap.tier.2000000',
  'id.jualdigital.app.iap.tier.5000000',
] as const

export type AppleIAPProductID = (typeof APPLE_IAP_PRODUCT_IDS)[number]

export interface AppleTransactionPayload {
  transactionId: string
  originalTransactionId?: string
  bundleId?: string
  productId?: string
  purchaseDate?: number
  quantity?: number
  type?: string
  environment?: string
  appAccountToken?: string
  storefront?: string
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64')
}

export function isAppleIAPProductId(productId: string | undefined): boolean {
  return !!productId && (APPLE_IAP_PRODUCT_IDS as readonly string[]).includes(productId)
}

export function parseAppleTransactionJWS(jws: string): AppleTransactionPayload {
  if (typeof jws !== 'string' || jws.split('.').length !== 3) {
    throw new Error('Transaksi App Store tidak valid')
  }

  const [headerB64, payloadB64, signatureB64] = jws.split('.')
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
    alg?: string
    x5c?: string[]
  }

  if (header.alg !== 'ES256') {
    throw new Error('Algoritma transaksi App Store tidak didukung')
  }

  const x5c = header.x5c
  if (!Array.isArray(x5c) || x5c.length === 0) {
    throw new Error('Sertifikat transaksi App Store tidak ada')
  }

  const leaf = new X509Certificate(Buffer.from(x5c[0], 'base64'))
  const subject = `${leaf.subject} ${leaf.issuer}`
  if (!/apple/i.test(subject)) {
    throw new Error('Sertifikat transaksi bukan dari Apple')
  }

  const signedData = `${headerB64}.${payloadB64}`
  const signature = decodeBase64Url(signatureB64)
  const verifier = createVerify('SHA256')
  verifier.update(signedData)
  let ok = verifier.verify(
    { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' },
    signature
  )
  if (!ok) {
    const derVerifier = createVerify('SHA256')
    derVerifier.update(signedData)
    ok = derVerifier.verify(leaf.publicKey, signature)
  }
  if (!ok) {
    throw new Error('Tanda tangan transaksi App Store tidak valid')
  }

  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as AppleTransactionPayload

  if (payload.bundleId && payload.bundleId !== APPLE_BUNDLE_ID) {
    throw new Error('Bundle ID transaksi tidak cocok')
  }
  if (!payload.transactionId) {
    throw new Error('transactionId tidak ada')
  }
  if (!isAppleIAPProductId(payload.productId)) {
    throw new Error('Produk In-App Purchase tidak dikenali')
  }

  return payload
}

export function normalizeUUID(value: string | undefined | null): string | null {
  if (!value) return null
  const hex = value.replace(/-/g, '').toLowerCase()
  if (hex.length !== 32) return value.toLowerCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
