import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/brands/:brandId/bundles
export async function GET(_req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const isOwner = session!.role === 'OWNER'

  const bundles = await prisma.bundle.findMany({
    where: { brandId: bid, isActive: true },
    orderBy: { nama: 'asc' },
    include: {
      items: {
        include: {
          product: { select: { id: true, nama: true, hpp: true } },
        },
      },
    },
  })

  return NextResponse.json(bundles.map(b => ({
    id: b.id,
    nama: b.nama,
    hargaJualDefault: Number(b.hargaJualDefault),
    ...(isOwner ? {
      hpp: b.items.reduce((sum, item) => sum + Number(item.product.hpp) * item.qty, 0),
    } : {}),
    items: b.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productNama: item.product.nama,
      qty: item.qty,
      ...(isOwner ? { hpp: Number(item.product.hpp) } : {}),
    })),
  })))
}

// POST /api/brands/:brandId/bundles — OWNER only
export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  const { nama, hargaJualDefault, items } = await req.json()

  if (!nama || !hargaJualDefault || !items?.length) {
    return NextResponse.json({ error: 'Nama, harga jual, dan minimal 1 produk wajib diisi' }, { status: 400 })
  }

  const bundle = await prisma.bundle.create({
    data: {
      brandId: bid,
      nama,
      hargaJualDefault: BigInt(hargaJualDefault),
      items: {
        create: items.map((item: { productId: number; qty: number }) => ({
          productId: item.productId,
          qty: item.qty ?? 1,
        })),
      },
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
  }, { status: 201 })
}
