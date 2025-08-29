import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const body = await req.json()

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if product exists and belongs to user
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json({ error: "Product not found or access denied" }, { status: 404 })
    }

    const {
      title, description, longDescription, category, price, variants,
      language, deliveryMethod, tags, livePreview, license, format,
      originalPrice, productLinks, downloadLimit, imageUrl, imageUrls, fileUrl, status, thumbnailIndex
    } = body

    // Update product
    const { data: product, error: productError } = await supabase
      .from("products")
      .update({
        title,
        description,
        long_description: longDescription,
        category,
        price: price ? parseFloat(price) || existingProduct.price : existingProduct.price,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        status: status || existingProduct.status,
        language: language || 'id',
        tags: tags || [],
        live_preview: livePreview || null,
        license: license || null,
        format: format || null,
        delivery_method: deliveryMethod || 'file',
        download_limit: downloadLimit || -1,
        pages: body.pages || null,
        file_url: deliveryMethod === 'file' ? (fileUrl || existingProduct.file_url) : null,
        download_link: deliveryMethod === 'link' && productLinks && productLinks.length > 0 ? productLinks[0].url : null,
        image_url: imageUrl || (imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined ? imageUrls[thumbnailIndex] : existingProduct.image_url),
        images: imageUrls && imageUrls.length > 0 ? imageUrls : existingProduct.images
      })
      .eq("id", params.id)
      .select()
      .single()

    if (productError) {
      console.error("Error updating product:", productError)
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }

    // Handle variants if provided
    if (variants && variants.length > 0) {
      // First, delete existing variants
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", params.id)

      if (deleteError) {
        console.error("Error deleting existing variants:", deleteError)
      }

      // Then insert new variants
      const variantsData = variants.map((variant: any) => ({
        product_id: params.id,
        name: variant.name,
        price: parseFloat(variant.price),
        description: variant.description || null
      }))

      const { error: variantsError } = await supabase
        .from("product_variants")
        .insert(variantsData)

      if (variantsError) {
        console.error("Error inserting variants:", variantsError)
        return NextResponse.json({ error: "Failed to update variants" }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      message: "Product updated successfully",
      product 
    })

  } catch (error) {
    console.error("Error in PUT /api/seller/products/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get product with variants
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get variants for this product
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", params.id)

    if (variantsError) {
      console.error("Error fetching variants:", variantsError)
    }

    return NextResponse.json({ 
      product,
      variants: variants || []
    })

  } catch (error) {
    console.error("Error in GET /api/seller/products/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
