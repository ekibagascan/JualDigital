/**
 * Subscription billing adapter.
 * MVP: period voucher (one-shot pay extends current_period_end).
 * Swap implementation when Xendit/Midtrans recurring credentials are available.
 */

export type SubscriptionBillingMode = 'period_voucher' | 'provider_recurring'

export interface CreateSubscriptionInput {
  userId: string
  productId: string
  tierId: string
  periodMonths?: number
  externalPaymentRef?: string
}

export interface BillingAdapter {
  mode: SubscriptionBillingMode
  createSubscription(input: CreateSubscriptionInput): Promise<{
    periodStart: Date
    periodEnd: Date
  }>
  cancelAtPeriodEnd(): Promise<void>
}

export function getBillingMode(): SubscriptionBillingMode {
  if (process.env.SUBSCRIPTION_PROVIDER === 'xendit' || process.env.SUBSCRIPTION_PROVIDER === 'midtrans') {
    return 'provider_recurring'
  }
  return 'period_voucher'
}

export function computePeriod(months = 1): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + months)
  return { periodStart, periodEnd }
}

export const periodVoucherAdapter: BillingAdapter = {
  mode: 'period_voucher',
  async createSubscription(input) {
    return computePeriod(input.periodMonths ?? 1)
  },
  async cancelAtPeriodEnd() {
    // no external provider to cancel
  },
}
