import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { formFile, getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formFile(formData, 'file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 500MB' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage.from('files').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('files').getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('Error in upload file API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
