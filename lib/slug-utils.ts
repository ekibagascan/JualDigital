/**
 * Slug utilities for seller store URLs
 * Handles generation, validation, and reserved slug checking
 */

// All existing route segments + common reserved words
const RESERVED_SLUGS = new Set([
  // Existing app routes
  'admin', 'api', 'auth', 'cart', 'categories', 'contact', 'dashboard',
  'debug', 'faq', 'help', 'login', 'mulai-jualan', 'payment', 'privacy',
  'product', 'produk', 'profile', 'purchases', 'register', 'search',
  'seller', 'terms', 'toko', 'wishlist',
  // Common reserved
  'app', 'www', 'support', 'settings', 'about', 'blog', 'news',
  'pricing', 'home', 'index', 'signup', 'signin', 'logout', 'account',
  'user', 'users', 'store', 'stores', 'shop', 'shops', 'marketplace',
  'order', 'orders', 'checkout', 'download', 'downloads', 'upload',
  'static', 'assets', 'public', 'favicon', 'robots', 'sitemap',
  'undefined', 'null', 'true', 'false',
])

/**
 * Generate a URL-safe slug from a string (e.g. business name)
 */
export function generateSlug(input: string): string {
  let slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // remove non-alphanumeric except space/hyphen
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens

  // Truncate to 30 chars
  if (slug.length > 30) {
    slug = slug.substring(0, 30).replace(/-$/, '')
  }

  // Ensure minimum length
  if (slug.length < 3) {
    slug = 'toko-' + slug
  }

  return slug
}

/**
 * Validate a slug: lowercase, alphanumeric + hyphens, 3-30 chars, not reserved
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug tidak boleh kosong' }
  }

  if (slug.length < 3) {
    return { valid: false, error: 'Slug minimal 3 karakter' }
  }

  if (slug.length > 30) {
    return { valid: false, error: 'Slug maksimal 30 karakter' }
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { valid: false, error: 'Slug hanya boleh huruf kecil, angka, dan strip (-)' }
  }

  if (slug.includes('--')) {
    return { valid: false, error: 'Slug tidak boleh mengandung strip ganda (--)' }
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: 'Slug ini sudah digunakan oleh sistem' }
  }

  return { valid: true }
}

/**
 * Check if a slug is reserved (matches existing routes or common words)
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}
