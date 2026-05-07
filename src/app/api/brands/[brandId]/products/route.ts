import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/brands/:brandId/products
// OWNER: dapat semua field termasuk hpp
// USER/MANAGER: dapat semua field KECUALI hpp
export async function GET(_req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const isOwner = session!.role === 'OWNER'

  const products = await prisma.product.findMany({
    where: { brandId: bid, isActive: true },
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      hargaJualDefault: true,
      ...(isOwner ? { hpp: true } : {}),
    },
  })

  // Convert BigInt to string for JSON serialization
  const result = products.map(p => ({
    ...p,
    hargaJualDefault: Number(p.hargaJualDefault),
    ...(isOwner && 'hpp' in p ? { hpp: Number((p as { hpp: bigint }).hpp) } : {}),
  }))

  return NextResponse.json(result)
}

// POST /api/brands/:brandId/products — OWNER only
export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { brandId } = await params
  const { nama, hpp, hargaJualDefault } = await req.json()

  if (!nama || hpp === undefined || hargaJualDefault === undefined) {
    return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
  }
  if (hpp < 0 || hargaJualDefault <= 0) {
    return NextResponse.json({ error: 'Nilai tidak valid' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: { brandId: parseInt(brandId), nama, hpp: BigInt(hpp), hargaJualDefault: BigInt(hargaJualDefault) },
  })
  return NextResponse.json({ ...product, hpp: Number(product.hpp), hargaJualDefault: Number(product.hargaJualDefault) }, { status: 201 })
}
