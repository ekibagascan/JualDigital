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
  calculateWithdrawalCommission(withdrawalAmount: number, totalEarnings: number): number {
    return 0 // No withdrawal commission
  }

  // Calculate net withdrawal amount (no commission on withdrawals)
  calculateNetWithdrawalAmount(withdrawalAmount: number, totalEarnings: number): number {
    return withdrawalAmount // Full amount, no commission
  }

  // Calculate available balance (no commission deduction)
  calculateAvailableBalance(totalEarnings: number): number {
    return totalEarnings // Full amount available
  }

  async createWithdrawal(withdrawalData: CreateWithdrawalRequest): Promise<Withdrawal> {
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .insert({
          seller_id: withdrawalData.seller_id,
          amount: withdrawalData.amount,
          status: 'pending',
          bank_name: withdrawalData.bank_name,
          account_number: withdrawalData.account_number,
          account_name: withdrawalData.account_name,
        })
        .select()

      if (error) {
        console.error('Create withdrawal error:', error)
        throw new Error('Failed to create withdrawal request')
      }

      if (!withdrawals || withdrawals.length === 0) {
        throw new Error('Failed to create withdrawal request')
      }

      return withdrawals[0]
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
      // Get total earnings from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_earnings')
        .eq('id', sellerId)
        .single()

      if (profileError) {
        console.error('Get profile earnings error:', profileError)
        return { total_earnings: 0, available_balance: 0 }
      }

      // Get pending and approved withdrawals (both should be subtracted from available balance)
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('amount, status')
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'approved'])

      if (withdrawalError) {
        console.error('Get withdrawals error:', withdrawalError)
        return { total_earnings: profile.total_earnings || 0, available_balance: profile.total_earnings || 0 }
      }

      const pendingAmount = withdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0) || 0
      const approvedAmount = withdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0) || 0
      const totalEarnings = profile.total_earnings || 0
      const availableBalance = totalEarnings - pendingAmount - approvedAmount

      return {
        total_earnings: totalEarnings,
        available_balance: Math.max(0, availableBalance),
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