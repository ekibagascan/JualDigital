export interface TelegramCheckoutProductLike {
  id: string
  title?: string
  tags?: string[] | null
  delivery_method?: string | null
  telegram_enabled?: boolean | null
  telegram_plan_code?: string | null
  telegram_stars_price?: number | null
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
