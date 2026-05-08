import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerOrManager, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/brands/:brandId/products/:productId — OWNER or MANAGER
export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string; productId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error
  const { brandId, productId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

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

// DELETE /api/brands/:brandId/products/:productId — OWNER or MANAGER
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ brandId: string; productId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error
  const { brandId, productId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  await prisma.product.update({ where: { id: parseInt(productId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
