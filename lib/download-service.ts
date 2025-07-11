import { supabase } from '@/lib/supabase-client'

export interface Download {
  id: string
  user_id: string
  product_id: string
  order_id: string
  download_url: string
  download_count: number
  last_downloaded: string
  created_at: string
  updated_at: string
}

export interface CreateDownloadRequest {
  user_id: string
  product_id: string
  order_id: string
  download_url: string
}

export class DownloadService {
  async createDownload(downloadData: CreateDownloadRequest): Promise<Download> {
    try {
      const { data: download, error } = await supabase
        .from('downloads')
        .insert({
          user_id: downloadData.user_id,
          product_id: downloadData.product_id,
          order_id: downloadData.order_id,
          download_url: downloadData.download_url,
          download_count: 0,
        })
        .select()
        .single()

      if (error) {
        console.error('Create download error:', error)
        throw new Error('Failed to create download record')
      }

      return download
    } catch (error) {
      console.error('Download service error:', error)
      throw error
    }
  }

  async getUserDownloads(userId: string): Promise<Download[]> {
    try {
      const { data: downloads, error } = await supabase
        .from('downloads')
        .select(`
          *,
          products:product_id (
            title,
            image_url,
            file_size,
            format
          ),
          orders:order_id (
            order_number,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get user downloads error:', error)
        return []
      }

      return downloads || []
    } catch (error) {
      console.error('Get user downloads error:', error)
      return []
    }
  }

  async getDownload(downloadId: string): Promise<Download | null> {
    try {
      const { data: download, error } = await supabase
        .from('downloads')
        .select('*')
        .eq('id', downloadId)
        .single()

      if (error) {
        console.error('Get download error:', error)
        return null
      }

      return download
    } catch (error) {
      console.error('Get download error:', error)
      return null
    }
  }

  async incrementDownloadCount(downloadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('downloads')
        .update({
          download_count: supabase.rpc('increment', { row_id: downloadId }),
          last_downloaded: new Date().toISOString(),
        })
        .eq('id', downloadId)

      if (error) {
        console.error('Increment download count error:', error)
        throw new Error('Failed to update download count')
      }
    } catch (error) {
      console.error('Increment download count error:', error)
      throw error
    }
  }

  async canUserDownload(userId: string, productId: string): Promise<boolean> {
    try {
      // Check if user has purchased the product
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('user_id', userId)
        .eq('product_id', productId)

      if (error) {
        console.error('Check user purchase error:', error)
        return false
      }

      return orderItems && orderItems.length > 0
    } catch (error) {
      console.error('Can user download error:', error)
      return false
    }
  }

  async getProductDownloadUrl(productId: string, userId: string): Promise<string | null> {
    try {
      // Get the product's download URL
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('download_link, file_url')
        .eq('id', productId)
        .single()

      if (productError) {
        console.error('Get product error:', productError)
        return null
      }

      // Check if user can download
      const canDownload = await this.canUserDownload(userId, productId)
      if (!canDownload) {
        return null
      }

      return product.download_link || product.file_url
    } catch (error) {
      console.error('Get download URL error:', error)
      return null
    }
  }

  async createDownloadRecord(userId: string, productId: string, orderId: string): Promise<void> {
    try {
      const downloadUrl = await this.getProductDownloadUrl(productId, userId)
      if (!downloadUrl) {
        throw new Error('Download URL not available')
      }

      await this.createDownload({
        user_id: userId,
        product_id: productId,
        order_id: orderId,
        download_url: downloadUrl,
      })
    } catch (error) {
      console.error('Create download record error:', error)
      throw error
    }
  }
}

export const downloadService = new DownloadService() 