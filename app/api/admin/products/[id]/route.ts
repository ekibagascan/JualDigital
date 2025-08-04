import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // Get product by ID
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single()

    if (productError) {
      console.error('[ADMIN PRODUCT API] Product query error:', productError)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })

  } catch (error) {
    console.error('[ADMIN PRODUCT API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // Update product
    const { data: product, error: updateError } = await supabase
      .from('products')
      .update({
        title: body.title,
        description: body.description,
        price: body.price,
        category: body.category,
        status: body.status,
        image_url: body.image_url,
        featured: body.featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[ADMIN PRODUCT API] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product })

  } catch (error) {
    console.error('[ADMIN PRODUCT API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // First, delete related records to avoid foreign key constraints
    // Delete order_items
    const { error: orderItemsDeleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('product_id', params.id)

    if (orderItemsDeleteError) {
      console.error('[ADMIN PRODUCT API] Order items delete error:', orderItemsDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete related order items', details: orderItemsDeleteError.message },
        { status: 500 }
      )
    }

    // Delete wishlist items
    const { error: wishlistDeleteError } = await supabase
      .from('wishlist')
      .delete()
      .eq('product_id', params.id)

    if (wishlistDeleteError) {
      console.error('[ADMIN PRODUCT API] Wishlist delete error:', wishlistDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete related wishlist items', details: wishlistDeleteError.message },
        { status: 500 }
      )
    }

    // Delete reviews
    const { error: reviewsDeleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('product_id', params.id)

    if (reviewsDeleteError) {
      console.error('[ADMIN PRODUCT API] Reviews delete error:', reviewsDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete related reviews', details: reviewsDeleteError.message },
        { status: 500 }
      )
    }

    // Then delete the product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[ADMIN PRODUCT API] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete product', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[ADMIN PRODUCT API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 