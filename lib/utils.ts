import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** One line on an order (IDR unit price × qty), rounded to whole rupiah. */
export function orderLineSubtotal(item: {
  price: number | string | null | undefined
  quantity: number | string | null | undefined
}): number {
  const p = Number(item.price)
  const q = Number(item.quantity)
  if (!Number.isFinite(p) || !Number.isFinite(q)) return 0
  return Math.round(p * q)
}

/** Sum of line subtotals (matches seller WhatsApp: only this seller’s rows). */
export function sumOrderItemsLineTotal(
  items: Array<{
    price: number | string | null | undefined
    quantity: number | string | null | undefined
  }>,
): number {
  return items.reduce((sum, item) => sum + orderLineSubtotal(item), 0)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
