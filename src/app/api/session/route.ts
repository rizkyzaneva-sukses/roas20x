import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ loggedIn: false })
  return NextResponse.json({
    loggedIn: true,
    userId: session.userId,
    nama: session.nama,
    role: session.role,
    brandIds: session.brandIds,
  })
}
