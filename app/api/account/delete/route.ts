import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/mobile-auth'
import { deleteUserAccount } from '@/lib/delete-account'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Anda harus masuk terlebih dahulu.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const confirmation = String(body.confirmation || '').trim()
    if (confirmation !== 'HAPUS') {
      return NextResponse.json(
        { error: 'Ketik HAPUS untuk mengonfirmasi penghapusan akun.' },
        { status: 400 }
      )
    }

    await deleteUserAccount(user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus akun'
    const status = /admin accounts cannot be deleted/i.test(message) ? 403 : 500
    return NextResponse.json(
      {
        error: status === 403
          ? 'Akun admin tidak bisa dihapus dari halaman ini.'
          : 'Gagal menghapus akun. Coba lagi, atau hubungi bantuan jika masih gagal.',
      },
      { status }
    )
  }
}
