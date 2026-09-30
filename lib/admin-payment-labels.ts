/** Map order payment_provider / payment_method to admin-friendly labels. Never invent "Xendit" for DANA. */
export function formatPaymentLabels(
  paymentProvider: string | null | undefined,
  paymentMethod: string | null | undefined
): { paymentMethod: string; paymentProvider: string } {
  const provider = (paymentProvider || '').toLowerCase().trim()
  const method = (paymentMethod || '').toLowerCase().trim()

  if (provider === 'dana' || method === 'dana') {
    const isVA = method === 'va' || method === 'virtual_account'
    return {
      paymentMethod: isVA ? 'Virtual Account' : 'DANA',
      paymentProvider: 'DANA',
    }
  }
  if (provider === 'bci' || method === 'crypto' || method.startsWith('crypto') || method === 'bci') {
    return { paymentMethod: 'Crypto', paymentProvider: 'BCI' }
  }
  if (provider === 'manual' || method === 'manual') {
    return { paymentMethod: 'Manual', paymentProvider: 'Manual' }
  }
  if (provider === 'apple' || method === 'apple_iap' || method === 'apple') {
    return { paymentMethod: 'Apple IAP', paymentProvider: 'Apple' }
  }
  if (provider === 'telegram' || method === 'telegram_stars' || method === 'telegram') {
    return { paymentMethod: 'Telegram Stars', paymentProvider: 'Telegram' }
  }
  if (method === 'va' || method === 'virtual_account') {
    return { paymentMethod: 'Virtual Account', paymentProvider: provider ? capitalize(provider) : 'DANA' }
  }

  if (provider === 'xendit' || method === 'xendit') {
    return { paymentMethod: 'Xendit (legacy)', paymentProvider: 'Xendit' }
  }

  if (provider) {
    return {
      paymentMethod: methodLabel(method) || capitalize(provider),
      paymentProvider: capitalize(provider),
    }
  }
  if (method) {
    return {
      paymentMethod: methodLabel(method),
      paymentProvider: methodLabel(method),
    }
  }

  return { paymentMethod: 'Tidak diketahui', paymentProvider: '—' }
}

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function methodLabel(method: string): string {
  switch (method) {
    case 'fiat':
      return 'Fiat'
    case 'bank_transfer':
      return 'Transfer Bank'
    case 'dana':
      return 'DANA'
    case 'manual':
      return 'Manual'
    case 'crypto':
      return 'Crypto'
    case 'va':
    case 'virtual_account':
      return 'Virtual Account'
    default:
      return method
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
  }
}
