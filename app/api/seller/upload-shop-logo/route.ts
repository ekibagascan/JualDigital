import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { formFile, getUserFromRequest, serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = serviceRoleClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formFile(formData, 'file', 'logo', 'image')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 })
    }

    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `shop-logos/${user.id}-${Date.now()}.${fileExtension}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      console.error('Error uploading shop logo:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ shop_logo: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating shop logo:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shopLogoUrl: publicUrl,
      message: 'Shop logo uploaded successfully',
    })
  } catch (error) {
    console.error('Error in shop logo upload:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
