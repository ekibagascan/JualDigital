import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await req.cookies
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

    // Fetch categories with product counts
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.slug)
          .eq('status', 'active')

        if (countError) {
          console.error(`Error counting products for category ${category.slug}:`, countError)
        }

        return {
          ...category,
          count: count || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      categories: categoriesWithCounts
    })

  } catch (error) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 