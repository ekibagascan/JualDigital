import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('Error in upload image API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
