import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerOrManager, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/brands/:brandId/tiers — OWNER or MANAGER (with brand access)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error

  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { tiers } = await req.json()

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return NextResponse.json({ error: 'Tiers harus array dan tidak boleh kosong' }, { status: 400 })
  }

  for (const t of tiers) {
    if (typeof t.label !== 'string' || typeof t.targetMargin !== 'number') {
      return NextResponse.json({ error: 'Format tier tidak valid' }, { status: 400 })
    }
  }

  const brand = await prisma.brand.update({
    where: { id: bid },
    data: { tiersJson: JSON.stringify(tiers) },
  })

  return NextResponse.json({
    ...brand,
    tiers: JSON.parse(brand.tiersJson),
  })
}
