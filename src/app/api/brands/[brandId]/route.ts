import { NextRequest, NextResponse } from 'next/server'
import { requireOwner, requireOwnerOrManager, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseTiers(tiersJson: string) {
  try { return JSON.parse(tiersJson) } catch { return [] }
}

// GET /api/brands/:brandId — OWNER or MANAGER (with brand access)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const brand = await prisma.brand.findUnique({
    where: { id: bid },
    include: {
      users: { include: { user: { select: { id: true, nama: true, username: true, role: true } } } },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })
  if (!brand) return NextResponse.json({ error: 'Brand tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ ...brand, tiers: parseTiers(brand.tiersJson) })
}

// PUT /api/brands/:brandId — OWNER or MANAGER (with brand access)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const brand = await prisma.brand.update({
    where: { id: bid },
    data: {
      ...(body.nama && { nama: body.nama }),
      ...(body.feeDefaultPersen !== undefined && { feeDefaultPersen: body.feeDefaultPersen }),
    },
  })
  return NextResponse.json({ ...brand, tiers: parseTiers(brand.tiersJson) })
}

// DELETE /api/brands/:brandId — OWNER only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { brandId } = await params
  await prisma.brand.update({ where: { id: parseInt(brandId) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
