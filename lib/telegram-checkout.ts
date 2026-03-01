export interface TelegramCheckoutProductLike {
  id: string
  title?: string
  tags?: string[] | null
  delivery_method?: string | null
  telegram_enabled?: boolean | null
  telegram_plan_code?: string | null
  telegram_stars_price?: number | null
}

export interface TelegramPricingBreakdown {
  idrUnitPrice: number
  quantity: number
  idrSubtotal: number
  starsUnitBase: number
  starsSubtotalBase: number
  adminFeePercent: number
  adminFeeStars: number
  totalStars: number
  idrPerStar: number
}

const TELEGRAM_TAGS = new Set(["telegram", "telegram_checkout", "telegram-stars"])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}

export function normalizeTelegramUsername(username?: string | null): string | null {
  if (!username) return null
  const normalized = username.trim().replace(/^@/, "")
  return normalized.length > 0 ? normalized : null
}

export function isTelegramCheckoutProduct(product: TelegramCheckoutProductLike): boolean {
  if (product.telegram_enabled === true) return true
  if (product.delivery_method?.toLowerCase() === "telegram") return true
  if (Array.isArray(product.tags)) {
    return product.tags.some((tag) => TELEGRAM_TAGS.has(tag.toLowerCase().trim()))
  }
  return false
}

export function getTelegramPlanCode(product: TelegramCheckoutProductLike): string {
  if (product.telegram_plan_code && product.telegram_plan_code.trim().length > 0) {
    return product.telegram_plan_code.trim()
  }
  const titlePart = slugify(product.title || "product")
  return `p_${titlePart}_${product.id.slice(0, 8)}`
}

export function getTelegramStartPayload(product: TelegramCheckoutProductLike): string {
  // Compact payload to stay under Telegram's 64-char start payload limit.
  return `buy_p_${product.id}`
}

export function getTelegramStartPayloadWithQuantity(
  product: TelegramCheckoutProductLike,
  quantity: number,
): string {
  const safeQty = Math.max(1, Math.min(Math.round(quantity || 1), 10))
  return `buy_p_${product.id}_q${safeQty}`
}

export function getTelegramBotUrlFromPayload(startPayload: string): string | null {
  const username = normalizeTelegramUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)
  if (!username) return null
  return `https://t.me/${username}?start=${encodeURIComponent(startPayload)}`
}

export function getTelegramProductStarsPrice(product: TelegramCheckoutProductLike, fallbackPrice?: number): number {
  if (typeof product.telegram_stars_price === "number" && product.telegram_stars_price > 0) {
    return Math.round(product.telegram_stars_price)
  }
  if (typeof fallbackPrice === "number" && fallbackPrice > 0) {
    return Math.max(1, Math.round(fallbackPrice))
  }
  return 1
}

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getTelegramPricingBreakdown(params: {
  product: TelegramCheckoutProductLike
  fallbackIdrPrice?: number
  quantity?: number
}): TelegramPricingBreakdown {
  const quantity = Math.max(1, Math.min(Math.round(params.quantity || 1), 10))
  const idrUnitPrice = Math.max(0, Math.round(params.fallbackIdrPrice || 0))
  const idrSubtotal = idrUnitPrice * quantity

  // Example default: 1 Star ~= IDR 1,000
  const idrPerStar = getEnvNumber("TELEGRAM_IDR_PER_STAR", 1000)
  const adminFeePercent = getEnvNumber("TELEGRAM_ADMIN_FEE_PERCENT", 5)

  const configuredStars = params.product.telegram_stars_price
  const starsUnitBase = typeof configuredStars === "number" && configuredStars > 0
    ? Math.max(1, Math.round(configuredStars))
    : Math.max(1, Math.ceil(idrUnitPrice / idrPerStar))

  const starsSubtotalBase = starsUnitBase * quantity
  const adminFeeStars = Math.ceil((starsSubtotalBase * adminFeePercent) / 100)
  const totalStars = starsSubtotalBase + adminFeeStars

  return {
    idrUnitPrice,
    quantity,
    idrSubtotal,
    starsUnitBase,
    starsSubtotalBase,
    adminFeePercent,
    adminFeeStars,
    totalStars,
    idrPerStar,
  }
}
