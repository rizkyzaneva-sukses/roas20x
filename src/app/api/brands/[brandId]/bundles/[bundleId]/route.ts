import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/brands/:brandId/bundles/:bundleId
export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string; bundleId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { bundleId } = await params
  const bid = parseInt(bundleId)

  const { nama, hargaJualDefault, items } = await req.json()

  // Replace items: delete all then recreate
  await prisma.bundleItem.deleteMany({ where: { bundleId: bid } })

  const bundle = await prisma.bundle.update({
    where: { id: bid },
    data: {
      ...(nama && { nama }),
      ...(hargaJualDefault !== undefined && { hargaJualDefault: BigInt(hargaJualDefault) }),
      ...(items?.length && {
        items: {
          create: items.map((item: { productId: number; qty: number }) => ({
            productId: item.productId,
            qty: item.qty ?? 1,
          })),
        },
      }),
    },
    include: {
      items: { include: { product: { select: { id: true, nama: true, hpp: true } } } },
    },
  })

  return NextResponse.json({
    id: bundle.id,
    nama: bundle.nama,
    hargaJualDefault: Number(bundle.hargaJualDefault),
    hpp: bundle.items.reduce((sum, item) => sum + Number(item.product.hpp) * item.qty, 0),
    items: bundle.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productNama: item.product.nama,
      qty: item.qty,
      hpp: Number(item.product.hpp),
    })),
  })
}

// DELETE /api/brands/:brandId/bundles/:bundleId
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ brandId: string; bundleId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { bundleId } = await params
  await prisma.bundle.update({ where: { id: parseInt(bundleId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
