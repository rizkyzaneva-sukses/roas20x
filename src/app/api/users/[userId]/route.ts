import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { userId } = await params
  const body = await req.json()

  const updateData: Record<string, unknown> = {}
  if (body.nama) updateData.nama = body.nama
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12)
  if (body.role) updateData.role = body.role

  const user = await prisma.user.update({
    where: { id: parseInt(userId) },
    data: updateData,
    select: { id: true, nama: true, username: true, role: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { userId } = await params
  await prisma.user.update({ where: { id: parseInt(userId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
