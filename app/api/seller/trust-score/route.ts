import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(req.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: "Seller ID is required" }, { status: 400 })
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user is requesting their own trust score
    if (user.id !== sellerId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get seller's sales data
    const { data: salesData } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        created_at,
        order_items (
          product_id,
          quantity,
          price
        )
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'completed')

    // Get seller's products and ratings
    const { data: productsData } = await supabase
      .from('products')
      .select(`
        id,
        total_sales,
        total_revenue,
        rating,
        total_reviews,
        created_at
      `)
      .eq('seller_id', sellerId)

    // Calculate metrics
    const totalSales = salesData?.length || 0
    const totalRevenue = salesData?.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0) || 0
    const totalProductsSold = salesData?.reduce((sum, order) => 
      sum + (order.order_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0) || 0

    // Calculate average rating
    const allRatings = productsData?.map(p => p.rating).filter(r => r > 0) || []
    const averageRating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0

    // Calculate days since first sale
    const firstSaleDate = salesData?.[0]?.created_at
    const daysSinceFirstSale = firstSaleDate ? 
      Math.floor((Date.now() - new Date(firstSaleDate).getTime()) / (1000 * 60 * 60 * 24)) : 0

    // Determine trust level
    let trustLevel: 'new' | 'trusted' | 'verified' = 'new'
    let canSelfActivate = false

    if (totalSales >= 50 && totalRevenue >= 5000000 && averageRating >= 4.5 && daysSinceFirstSale >= 30) {
      trustLevel = 'verified'
      canSelfActivate = true
    } else if (totalSales >= 10 && totalRevenue >= 1000000 && averageRating >= 4.0 && daysSinceFirstSale >= 7) {
      trustLevel = 'trusted'
      canSelfActivate = true
    } else {
      trustLevel = 'new'
      canSelfActivate = false
    }

    const trustScore = {
      totalSales,
      totalRevenue,
      averageRating,
      totalReviews: productsData?.reduce((sum, p) => sum + (p.total_reviews || 0), 0) || 0,
      daysSinceFirstSale,
      productsSold: totalProductsSold,
      returnRate: 0, // Would need returns data
      trustLevel,
      canSelfActivate
    }

    return NextResponse.json(trustScore)

  } catch (error) {
    console.error("Error calculating trust score:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 