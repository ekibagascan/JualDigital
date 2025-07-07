import { createClient } from '@/lib/supabase-client'

export interface Notification {
  id: string
  user_id: string
  type: 'order' | 'payment' | 'download' | 'review' | 'withdrawal' | 'system'
  title: string
  message: string
  is_read: boolean
  data?: any
  created_at: string
  updated_at: string
}

export interface CreateNotificationRequest {
  user_id: string
  type: string
  title: string
  message: string
  data?: any
}

export class NotificationService {
  private supabase = createClient()

  async createNotification(notificationData: CreateNotificationRequest): Promise<Notification> {
    try {
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data,
          is_read: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Create notification error:', error)
        throw new Error('Failed to create notification')
      }

      return notification
    } catch (error) {
      console.error('Notification service error:', error)
      throw error
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get user notifications error:', error)
        return []
      }

      return notifications || []
    } catch (error) {
      console.error('Get user notifications error:', error)
      return []
    }
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get unread notifications error:', error)
        return []
      }

      return notifications || []
    } catch (error) {
      console.error('Get unread notifications error:', error)
      return []
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Mark as read error:', error)
        throw new Error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Mark as read error:', error)
      throw error
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Mark all as read error:', error)
        throw new Error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Mark all as read error:', error)
      throw error
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Delete notification error:', error)
        throw new Error('Failed to delete notification')
      }
    } catch (error) {
      console.error('Delete notification error:', error)
      throw error
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Get unread count error:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Get unread count error:', error)
      return 0
    }
  }

  // Helper methods for creating specific types of notifications
  async createOrderNotification(userId: string, orderNumber: string, status: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'order',
      title: `Pesanan ${orderNumber}`,
      message: `Status pesanan Anda telah diperbarui menjadi ${status}`,
      data: { order_number: orderNumber, status }
    })
  }

  async createPaymentNotification(userId: string, orderNumber: string, amount: number): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'payment',
      title: 'Pembayaran Berhasil',
      message: `Pembayaran untuk pesanan ${orderNumber} sebesar Rp${amount.toLocaleString()} telah berhasil`,
      data: { order_number: orderNumber, amount }
    })
  }

  async createDownloadNotification(userId: string, productTitle: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'download',
      title: 'Download Tersedia',
      message: `Produk "${productTitle}" siap diunduh`,
      data: { product_title: productTitle }
    })
  }

  async createWithdrawalNotification(userId: string, amount: number, status: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'withdrawal',
      title: 'Permintaan Penarikan',
      message: `Permintaan penarikan sebesar Rp${amount.toLocaleString()} telah ${status}`,
      data: { amount, status }
    })
  }
}

export const notificationService = new NotificationService() 