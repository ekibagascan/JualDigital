import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Test products bucket
    const { data: productsList, error: productsError } = await supabase.storage
      .from('products')
      .list('', { limit: 1 })

    // Test files bucket
    const { data: filesList, error: filesError } = await supabase.storage
      .from('files')
      .list('', { limit: 1 })

    return NextResponse.json({ 
      products: { data: productsList, error: productsError },
      files: { data: filesList, error: filesError },
      env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })

  } catch (error) {
    console.error("Error testing storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 