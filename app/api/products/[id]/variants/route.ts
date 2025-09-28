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
    
    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Error fetching product variants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product variants' },
      { status: 500 }
    )
  }
} 