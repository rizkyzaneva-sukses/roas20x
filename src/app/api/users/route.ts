import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const { error } = await requireOwner()
  if (error) return error

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, nama: true, username: true, role: true, isActive: true, createdAt: true,
      brands: { select: { brand: { select: { id: true, nama: true } } } },
    },
    orderBy: { nama: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { error } = await requireOwner()
  if (error) return error

  const { nama, username, password, role } = await req.json()
  if (!nama || !username || !password) {
    return NextResponse.json({ error: 'Nama, username, dan password wajib diisi' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } })
  if (exists) return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { nama, username: username.toLowerCase().trim(), passwordHash, role: role ?? 'USER' },
    select: { id: true, nama: true, username: true, role: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
