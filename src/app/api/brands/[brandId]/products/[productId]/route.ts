import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string; productId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { productId } = await params
  const body = await req.json()

  const product = await prisma.product.update({
    where: { id: parseInt(productId) },
    data: {
      ...(body.nama && { nama: body.nama }),
      ...(body.hpp !== undefined && { hpp: BigInt(body.hpp) }),
      ...(body.hargaJualDefault !== undefined && { hargaJualDefault: BigInt(body.hargaJualDefault) }),
    },
  })
  return NextResponse.json({
    ...product,
    hpp: Number(product.hpp),
    hargaJualDefault: Number(product.hargaJualDefault),
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ brandId: string; productId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { productId } = await params
  await prisma.product.update({ where: { id: parseInt(productId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
