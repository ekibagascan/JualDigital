/** EULA / Terms version shown on /terms and stored by POST /api/terms/accept. */
export const CURRENT_TERMS_VERSION = '2026-11-20'

const VERSION_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/

export function normalizeTermsVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const version = value.trim()
  if (!VERSION_PATTERN.test(version)) return null
  return version
}
