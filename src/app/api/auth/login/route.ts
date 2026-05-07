import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { brands: { select: { brandId: true } } },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.userId = user.id
    session.username = user.username
    session.nama = user.nama
    session.role = user.role as 'OWNER' | 'USER'
    session.brandIds = user.brands.map(b => b.brandId)
    await session.save()

    return NextResponse.json({ ok: true, role: user.role })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
