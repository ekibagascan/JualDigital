import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { calculateSellerTrustScore } from '@/lib/seller-trust-service'

export async function POST(req: NextRequest) {
  try {
    // Create Supabase client with service role key
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Route handler - cookies set via response
          },
        },
      }
    )

    // Get user from auth token (try multiple cookie names)
    let user = null

    // Try to get user from auth
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
    
    if (!userError && authUser) {
      user = authUser
    }

    // Get request body for product data
    const body = await req.json()
    const { 
      title, 
      description, 
      longDescription, 
      category, 
      price, 
      variants, 
      sellerId,
      language,
      deliveryMethod,
      tags,
      livePreview,
      license,
      format,
      originalPrice,
      productLinks,
      downloadLimit,
      imageUrl,
      imageUrls,
      thumbnailIndex
    } = body

    // If auth failed, try to get user from sellerId in body
    if (!user && sellerId) {
      // Get user profile by ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single()
      
      if (profile && profile.role === 'seller') {
        user = { id: sellerId }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Seller access required' },
        { status: 401 }
      )
    }

    // Check if user is a seller
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json(
        { error: 'Seller access required' },
        { status: 403 }
      )
    }

    if (!title || !description || !category || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check seller trust level to determine initial status
    const trustScore = await calculateSellerTrustScore(user.id)
    const initialStatus = trustScore.canSelfActivate ? 'active' : 'draft'

    // Create product first
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        title,
        description,
        long_description: longDescription,
        category,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        seller_id: user.id,
        status: initialStatus, // Use trust-based status
        language: language || 'id',
        tags: tags || [],
        live_preview: livePreview || null,
        license: license || null,
        format: format || null,
        delivery_method: deliveryMethod || 'file',
        download_limit: downloadLimit || -1,
        // Handle file_url or download_link based on delivery method
        file_url: deliveryMethod === 'file' ? null : null,
        download_link: deliveryMethod === 'link' && productLinks && productLinks.length > 0 
          ? productLinks[0].url 
          : null,

        // Handle image URL for product thumbnail - use selected thumbnail or first image
        image_url: (imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined) 
          ? imageUrls[thumbnailIndex] || imageUrls[0] 
          : imageUrl || null,
        // Handle multiple images
        images: imageUrls && imageUrls.length > 0 ? imageUrls : null
      })
      .select()
      .single()

    if (productError) {
      console.error('[SELLER PRODUCTS API] Product creation error:', productError)
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    // Create product variants if provided
    if (variants && variants.length > 0 && product) {
      const variantData = variants.map((variant: { name: string; price: number; description: string }) => ({
        product_id: product.id,
        name: variant.name,
        price: variant.price,
        description: variant.description || ''
      }))

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantData)

      if (variantError) {
        console.error('[SELLER PRODUCTS API] Variant creation error:', variantError)
        // Don't fail the entire request if variants fail, just log the error
      }
    } else if (product) {
      // Create default variant if none provided
      const { error: defaultVariantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          name: 'Standard',
          price: parseFloat(price),
          description: 'Default variant'
        })

      if (defaultVariantError) {
        console.error('[SELLER PRODUCTS API] Default variant creation error:', defaultVariantError)
      }
    }

    return NextResponse.json({
      success: true,
      product
    })

  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check seller authentication
    const authToken = req.cookies.get('sb-e52fc39c-d56c-418c-b470-934337d0286b-auth-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Route handler - cookies set via response
          },
        },
      }
    )

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get seller's products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('[SELLER PRODUCTS API] Products fetch error:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products
    })

  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 