import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseTiers(tiersJson: string) {
  try { return JSON.parse(tiersJson) } catch { return [] }
}

// GET /api/brands — OWNER: semua brand | USER/MANAGER: brand yang di-assign
export async function GET() {
  const { session, error } = await requireOwner()
  if (error) {
    const { getSession } = await import('@/lib/auth')
    const sess = await getSession()
    if (!sess.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const brands = await prisma.brand.findMany({
      where: { id: { in: sess.brandIds }, isActive: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, feeDefaultPersen: true, tiersJson: true },
    })
    return NextResponse.json(brands.map(b => ({ ...b, tiers: parseTiers(b.tiersJson) })))
  }

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { nama: 'asc' },
    include: {
      _count: { select: { products: { where: { isActive: true } }, users: true } },
    },
  })
  return NextResponse.json(brands.map(b => ({ ...b, tiers: parseTiers(b.tiersJson) })))
}

// POST /api/brands — OWNER only
export async function POST(req: NextRequest) {
  const { error } = await requireOwner()
  if (error) return error

  const { nama, feeDefaultPersen } = await req.json()
  if (!nama) return NextResponse.json({ error: 'Nama brand wajib diisi' }, { status: 400 })

  const DEFAULT_TIERS = JSON.stringify([
    { label: 'BEP', targetMargin: 0 },
    { label: 'Margin Tipis', targetMargin: 5 },
    { label: 'Margin Sedang', targetMargin: 15 },
    { label: 'Proporsional', targetMargin: 25 },
  ])

  const brand = await prisma.brand.create({
    data: { nama, feeDefaultPersen: feeDefaultPersen ?? 18, tiersJson: DEFAULT_TIERS },
  })
  return NextResponse.json({ ...brand, tiers: parseTiers(brand.tiersJson) }, { status: 201 })
}
