import { createClient } from '@/lib/supabase-client'

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
  user_name?: string
  user_avatar?: string
}

export interface CreateReviewRequest {
  product_id: string
  user_id: string
  rating: number
  comment: string
}

export class ReviewService {
  private supabase = createClient()

  async createReview(reviewData: CreateReviewRequest): Promise<Review> {
    try {
      const { data: review, error } = await this.supabase
        .from('reviews')
        .insert({
          product_id: reviewData.product_id,
          user_id: reviewData.user_id,
          rating: reviewData.rating,
          comment: reviewData.comment,
        })
        .select()
        .single()

      if (error) {
        console.error('Create review error:', error)
        throw new Error('Failed to create review')
      }

      return review
    } catch (error) {
      console.error('Review service error:', error)
      throw error
    }
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    try {
      const { data: reviews, error } = await this.supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (
            name,
            avatar_url
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get reviews error:', error)
        return []
      }

      return reviews?.map(review => ({
        ...review,
        user_name: review.profiles?.name,
        user_avatar: review.profiles?.avatar_url,
      })) || []
    } catch (error) {
      console.error('Get reviews error:', error)
      return []
    }
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const { data: reviews, error } = await this.supabase
        .from('reviews')
        .select(`
          *,
          products:product_id (
            title,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get user reviews error:', error)
        return []
      }

      return reviews || []
    } catch (error) {
      console.error('Get user reviews error:', error)
      return []
    }
  }

  async updateReview(reviewId: string, rating: number, comment: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('reviews')
        .update({
          rating,
          comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (error) {
        console.error('Update review error:', error)
        throw new Error('Failed to update review')
      }
    } catch (error) {
      console.error('Update review error:', error)
      throw error
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('Delete review error:', error)
        throw new Error('Failed to delete review')
      }
    } catch (error) {
      console.error('Delete review error:', error)
      throw error
    }
  }

  async canUserReview(userId: string, productId: string): Promise<boolean> {
    try {
      // Check if user has purchased the product
      const { data: orders, error } = await this.supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', productId)
        .eq('user_id', userId)

      if (error) {
        console.error('Check user purchase error:', error)
        return false
      }

      // Check if user has already reviewed
      const { data: existingReview, error: reviewError } = await this.supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single()

      if (reviewError && reviewError.code !== 'PGRST116') {
        console.error('Check existing review error:', reviewError)
        return false
      }

      return orders && orders.length > 0 && !existingReview
    } catch (error) {
      console.error('Can user review error:', error)
      return false
    }
  }
}

export const reviewService = new ReviewService() 