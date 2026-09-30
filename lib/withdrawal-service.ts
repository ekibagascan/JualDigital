import { supabase } from '@/lib/supabase-client'

export interface Withdrawal {
  id: string
  seller_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  bank_name: string
  account_number: string
  account_name: string
  rejection_reason?: string
  processed_at?: string
  created_at: string
}

export interface CreateWithdrawalRequest {
  seller_id: string
  amount: number
  bank_name: string
  account_number: string
  account_name: string
}

export class WithdrawalService {
  // No commission on withdrawals - commission is charged on sales like Gumroad
  calculateWithdrawalCommission(): number {
    return 0 // No withdrawal commission
  }

  // Calculate net withdrawal amount (no commission on withdrawals)
  calculateNetWithdrawalAmount(withdrawalAmount: number): number {
    return withdrawalAmount // Full amount, no commission
  }

  // Calculate available balance (no commission deduction)
  calculateAvailableBalance(totalEarnings: number): number {
    return totalEarnings // Full amount available
  }

  /**
   * Create via server API so auth + available balance are enforced server-side.
   * Do not insert into `withdrawals` from the browser — that bypasses validation.
   */
  async createWithdrawal(withdrawalData: CreateWithdrawalRequest): Promise<Withdrawal> {
    try {
      const response = await fetch('/api/seller/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: withdrawalData.amount,
          bank_name: withdrawalData.bank_name,
          account_number: withdrawalData.account_number,
          account_name: withdrawalData.account_name,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Gagal membuat permintaan penarikan'
        throw new Error(message)
      }

      if (!payload?.withdrawal) {
        throw new Error('Gagal membuat permintaan penarikan')
      }

      return payload.withdrawal as Withdrawal
    } catch (error) {
      console.error('Withdrawal service error:', error)
      throw error
    }
  }

  async getSellerWithdrawals(sellerId: string): Promise<Withdrawal[]> {
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get seller withdrawals error:', error)
        return []
      }

      return withdrawals || []
    } catch (error) {
      console.error('Get seller withdrawals error:', error)
      return []
    }
  }

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles:seller_id (
            name,
            business_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get all withdrawals error:', error)
        return []
      }

      return withdrawals || []
    } catch (error) {
      console.error('Get all withdrawals error:', error)
      return []
    }
  }

  async updateWithdrawalStatus(withdrawalId: string, status: string, rejectionReason?: string): Promise<void> {
    try {
      const updateData: { status: string; processed_at?: string; rejection_reason?: string } = { 
        status
      }
      
      if (status === 'approved' || status === 'rejected' || status === 'completed') {
        updateData.processed_at = new Date().toISOString()
      }
      
      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', withdrawalId)

      if (error) {
        console.error('Update withdrawal status error:', error)
        throw new Error('Failed to update withdrawal status')
      }
    } catch (error) {
      console.error('Update withdrawal status error:', error)
      throw error
    }
  }

  async getWithdrawal(withdrawalId: string): Promise<Withdrawal | null> {
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)

      if (error) {
        console.error('Get withdrawal error:', error)
        return null
      }

      if (!withdrawals || withdrawals.length === 0) {
        return null
      }

      return withdrawals[0]
    } catch (error) {
      console.error('Get withdrawal error:', error)
      return null
    }
  }

  async getSellerEarnings(sellerId: string): Promise<{ total_earnings: number; available_balance: number }> {
    try {
      // Lifetime earnings from paid order items (same source as seller dashboard)
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('seller_earnings, orders!inner(status)')
        .eq('seller_id', sellerId)
        .eq('orders.status', 'paid')

      if (orderItemsError) {
        console.error('Get order items earnings error:', orderItemsError)
        return { total_earnings: 0, available_balance: 0 }
      }

      const totalEarnings =
        orderItems?.reduce(
          (sum, item: { seller_earnings: number }) => sum + (item.seller_earnings || 0),
          0
        ) || 0

      // Deduct pending, approved, and completed withdrawals so completed payouts
      // cannot be withdrawn again. Rejected requests are not deducted.
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('amount, status')
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'approved', 'completed'])

      if (withdrawalError) {
        console.error('Get withdrawals error:', withdrawalError)
        return { total_earnings: totalEarnings, available_balance: totalEarnings }
      }

      const deducted =
        withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

      return {
        total_earnings: totalEarnings,
        available_balance: Math.max(0, totalEarnings - deducted),
      }
    } catch (error) {
      console.error('Get seller earnings error:', error)
      return { total_earnings: 0, available_balance: 0 }
    }
  }

  async canWithdraw(sellerId: string, amount: number): Promise<boolean> {
    try {
      const earnings = await this.getSellerEarnings(sellerId)
      return earnings.available_balance >= amount
    } catch (error) {
      console.error('Can withdraw error:', error)
      return false
    }
  }
}

export const withdrawalService = new WithdrawalService() 