import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/brands/:brandId/bundles/:bundleId — All authenticated users with brand access
export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string; bundleId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId, bundleId } = await params
  const brid = parseInt(brandId)
  const bid = parseInt(bundleId)

  if (!canAccessBrand(session!, brid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const isOwner = session!.role === 'OWNER'

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
    ...(isOwner ? {
      hpp: bundle.items.reduce((sum, item) => sum + Number(item.product.hpp) * item.qty, 0),
    } : {}),
    items: bundle.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productNama: item.product.nama,
      qty: item.qty,
      ...(isOwner ? { hpp: Number(item.product.hpp) } : {}),
    })),
  })
}

// DELETE /api/brands/:brandId/bundles/:bundleId — All authenticated users with brand access
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ brandId: string; bundleId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId, bundleId } = await params
  const brid = parseInt(brandId)

  if (!canAccessBrand(session!, brid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  await prisma.bundle.update({ where: { id: parseInt(bundleId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
