export interface SellerTrustScore {
  totalSales: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  daysSinceFirstSale: number
  productsSold: number
  returnRate: number
  trustLevel: 'new' | 'trusted' | 'verified'
  canSelfActivate: boolean
}

export async function calculateSellerTrustScore(sellerId: string): Promise<SellerTrustScore> {
  try {
    // For server-side API routes, we need to calculate the trust score directly
    // instead of making an HTTP request to ourselves
    const { createClient } = require('@supabase/supabase-js')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate trust score directly
    const { data: salesData } = await supabase
      .from('order_items')
      .select('quantity, seller_earnings')
      .eq('seller_id', sellerId)

    const { data: productsData } = await supabase
      .from('products')
      .select('id, created_at')
      .eq('seller_id', sellerId)

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId)

    // Calculate metrics
    const totalSales = salesData?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0
    const totalRevenue = salesData?.reduce((sum: number, item: any) => sum + parseFloat(item.seller_earnings || '0'), 0) || 0
    const averageRating = reviewsData?.length > 0 
      ? reviewsData.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviewsData.length 
      : 0
    const totalReviews = reviewsData?.length || 0
    const productsSold = productsData?.length || 0

    // Calculate trust level
    let trustLevel: 'new' | 'trusted' | 'verified' = 'new'
    let canSelfActivate = false

    if (totalSales >= 50 && totalRevenue >= 1000000 && averageRating >= 4.5) {
      trustLevel = 'verified'
      canSelfActivate = true
    } else if (totalSales >= 10 && totalRevenue >= 500000 && averageRating >= 4.0) {
      trustLevel = 'trusted'
      canSelfActivate = true
    }

    return {
      totalSales,
      totalRevenue,
      averageRating,
      totalReviews,
      daysSinceFirstSale: 0, // Could calculate this if needed
      productsSold,
      returnRate: 0, // Could calculate this if needed
      trustLevel,
      canSelfActivate
    }
  } catch (error) {
    console.error('Error calculating trust score:', error)
    // Return default values if calculation fails
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0,
      daysSinceFirstSale: 0,
      productsSold: 0,
      returnRate: 0,
      trustLevel: 'new',
      canSelfActivate: false
    }
  }
}

export function getTrustLevelDisplay(trustLevel: string): { label: string; color: string; description: string } {
  switch (trustLevel) {
    case 'verified':
      return {
        label: 'Verified Seller',
        color: 'text-green-600 bg-green-100',
        description: 'Can publish products immediately'
      }
    case 'trusted':
      return {
        label: 'Trusted Seller',
        color: 'text-blue-600 bg-blue-100',
        description: 'Can publish products immediately'
      }
    default:
      return {
        label: 'New Seller',
        color: 'text-orange-600 bg-orange-100',
        description: 'Products require admin review'
      }
  }
} 