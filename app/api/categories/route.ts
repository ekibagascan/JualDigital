import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, slug, description, icon, created_at')
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count, error: countError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('category', category.slug)
          .eq('status', 'active')

        if (countError) {
          console.error(`Error counting products for category ${category.slug}:`, countError)
        }

        return {
          ...category,
          count: count || 0,
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        categories: categoriesWithCounts,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
