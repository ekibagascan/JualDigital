/**
 * Objectionable-content and social-manipulation checks.
 *
 * Social-boost matching is intentionally phrase-based for "likes" and "views"
 * (those words are common in ordinary copy) and whole-word for followers,
 * subscribers, and SMM. Keep sql/list_social_manipulation_products.sql aligned
 * with SOCIAL_PATTERNS.
 */

export const OBJECTIONABLE_CONTENT_CODE = 'objectionable_content'
export const SOCIAL_MANIPULATION_CODE = 'social_manipulation_prohibited'

const PROFANITY_WORDS = [
  'fuck',
  'fucking',
  'motherfucker',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'porn',
  'porno',
  'pornography',
  'pornografi',
  'hentai',
  'bokep',
  'xxx',
  'anjing',
  'anjeng',
  'bangsat',
  'bajingan',
  'kontol',
  'memek',
  'meki',
  'pepek',
  'ngentot',
  'ngentod',
  'brengsek',
  'keparat',
  'jancok',
  'jancuk',
  'asu',
  'pukimak',
  'kimak',
  'kampret',
  'goblok',
  'tolol',
  'bego',
  'lonte',
  'pelacur',
  'pecun',
  'tai',
]

const SOCIAL_PATTERNS = [
  '\\bfollowers?\\b',
  '\\bsubscribers?\\b',
  '\\bsmm\\b',
  '\\bsmm[\\s-]*panel\\b',
  '\\bpanel[\\s-]*smm\\b',
  '\\bboost\\s+akun\\b',
  '\\bboost\\s+accounts?\\b',
  '\\bakun\\s+boost\\b',
  '\\baccount\\s+boost(?:ing)?\\b',
  '\\bsuntik[\\s-]*(?:followers?|likes?|views?|subscribers?|subs?|follows?)\\b',
  '\\bsuntik(?:followers?|likes?|views?|subscribers?|subs?)\\b',
  '\\b(?:buy|sell|jual|beli|tambah(?:in)?|naik(?:kan|in)?|boost|increase|gain|add)\\s+(?:followers?|likes?|views?|subscribers?)\\b',
  '\\b(?:followers?|likes?|views?|subscribers?)\\s+(?:instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\\b',
  '\\b(?:instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\\s+(?:followers?|likes?|views?|subscribers?)\\b',
  '\\bjasa\\s+(?:followers?|likes?|views?|subscribers?|smm)\\b',
  '\\bjasa\\s+(?:naik(?:kan|in)?|tambah(?:in)?)\\s+(?:followers?|likes?|views?|subscribers?|follows?|likes?|views?|subs?)\\b',
  '\\bauto[\\s-]?(?:likes?|follows?|followers?|views?|subscribers?)\\b',
  '\\bfake\\s+(?:followers?|likes?|views?|subscribers?|engagement)\\b',
  '\\breal\\s+(?:followers?|likes?)\\b',
  '\\b(?:\\d{2,}|\\d+\\s*k)\\s*(?:followers?|likes?|views?|subscribers?)\\b',
  '\\b\\d{1,3}(?:[.\\s]\\d{3})+\\s*(?:followers?|likes?|views?|subscribers?)\\b',
  '\\blikers?\\b',
]

const profanityRegex = new RegExp(
  `(^|[^a-z])(?:${PROFANITY_WORDS.map(escapeRegex).join('|')})([^a-z]|$)`,
  'i'
)

const socialRegex = new RegExp(SOCIAL_PATTERNS.join('|'), 'i')

export type CatalogText = {
  title?: string | null
  description?: string | null
  long_description?: string | null
  category?: string | null
  tags?: string[] | string | null
}

export type PolicyViolation = {
  code: typeof OBJECTIONABLE_CONTENT_CODE | typeof SOCIAL_MANIPULATION_CODE
  error: string
  message: string
  message_en: string
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Lowercase for matching. Digits stay digits so "1000 likes" is not rewritten. */
export function normalizeForMatch(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

/** Fold a few leetspeak characters so "k0ntol" still matches profanity. */
export function foldContent(input: string): string {
  return normalizeForMatch(input)
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
}

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false
  return profanityRegex.test(foldContent(text))
}

export function containsProfanityIn(...parts: Array<string | null | undefined>): boolean {
  return containsProfanity(parts.filter((part) => part && part.trim()).join('\n'))
}

export function isSocialManipulationText(...parts: Array<string | null | undefined>): boolean {
  const text = parts.filter((part) => part && String(part).trim()).join('\n')
  if (!text.trim()) return false
  return socialRegex.test(normalizeForMatch(text))
}

export function catalogBlob(product: CatalogText, extras: Array<string | null | undefined> = []): string {
  const tags = Array.isArray(product.tags)
    ? product.tags.join(' ')
    : product.tags || ''
  return [product.title, product.description, product.long_description, product.category, tags, ...extras]
    .filter((part) => part && String(part).trim())
    .join('\n')
}

export function isSocialManipulationProduct(
  product: CatalogText,
  extras: Array<string | null | undefined> = []
): boolean {
  return isSocialManipulationText(catalogBlob(product, extras))
}

export function isHiddenCatalogProduct(
  product: CatalogText,
  extras: Array<string | null | undefined> = []
): boolean {
  const blob = catalogBlob(product, extras)
  return containsProfanity(blob) || isSocialManipulationText(blob)
}

export function isProhibitedCategory(category: {
  name?: string | null
  slug?: string | null
  description?: string | null
}): boolean {
  const slug = (category.slug || '').replace(/[-_]+/g, ' ')
  return isSocialManipulationText(category.name, slug, category.description)
}

const PROFANITY_VIOLATION: PolicyViolation = {
  code: OBJECTIONABLE_CONTENT_CODE,
  error: 'Konten mengandung kata yang tidak diizinkan.',
  message: 'Hapus bahasa kasar, ujaran kebencian, atau konten seksual sebelum menyimpan.',
  message_en: 'Remove profanity, hate speech, or sexual content before saving.',
}

export class CatalogPolicyError extends Error {
  code = SOCIAL_MANIPULATION_CODE
  constructor() {
    super(
      'Produk ini tidak tersedia. Penjualan followers, likes, views, subscriber, atau boost akun tidak diizinkan.'
    )
    this.name = 'CatalogPolicyError'
  }
}

const SOCIAL_VIOLATION: PolicyViolation = {
  code: SOCIAL_MANIPULATION_CODE,
  error: 'Produk manipulasi media sosial tidak diizinkan.',
  message:
    'Jual Digital tidak mengizinkan penjualan followers, likes, views, subscriber, SMM panel, suntik followers, atau jasa boost akun.',
  message_en:
    'Selling followers, likes, views, subscribers, SMM panels, or social-account boosting is not allowed.',
}

function isUnpublishStatus(status: string | null | undefined): boolean {
  const value = (status || '').toLowerCase()
  return value === 'draft' || value === 'inactive'
}

/**
 * Reject profanity and social-boost listings.
 * Updates that only unpublish (draft/inactive) are allowed so a seller can take a listing down.
 */
export function validateProductListing(input: {
  product: CatalogText
  extras?: Array<string | null | undefined>
  creating?: boolean
  status?: string | null
}): PolicyViolation | null {
  const blob = catalogBlob(input.product, input.extras || [])
  const unpublishing = !input.creating && isUnpublishStatus(input.status)
  if (unpublishing) return null
  if (containsProfanity(blob)) return PROFANITY_VIOLATION
  if (isSocialManipulationText(blob)) return SOCIAL_VIOLATION
  return null
}

export function validateUserText(...parts: Array<string | null | undefined>): PolicyViolation | null {
  if (containsProfanityIn(...parts)) return PROFANITY_VIOLATION
  return null
}
