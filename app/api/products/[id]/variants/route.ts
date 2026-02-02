import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { productService } from '@/lib/product-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const variants = await productService.getProductVariants(productId)

    const res = NextResponse.json({ variants })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.headers.set('Pragma', 'no-cache')
    return res
  } catch (error) {
    console.error('Error fetching product variants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product variants' },
      { status: 500 }
    )
  }
} 