import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseTiers(tiersJson: string) {
  try { return JSON.parse(tiersJson) } catch { return [] }
}

// GET /api/brands — OWNER: all brands | MANAGER: assigned brands (with full data) | USER: assigned brands (basic)
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  if (session!.role === 'OWNER') {
    // OWNER sees all brands with full data
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { nama: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } }, users: true } },
      },
    })
    return NextResponse.json(brands.map(b => ({ ...b, tiers: parseTiers(b.tiersJson) })))
  }

  if (session!.role === 'MANAGER') {
    // MANAGER sees assigned brands with full data (like OWNER but limited to assigned)
    const brands = await prisma.brand.findMany({
      where: { id: { in: session!.brandIds }, isActive: true },
      orderBy: { nama: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } }, users: true } },
      },
    })
    return NextResponse.json(brands.map(b => ({ ...b, tiers: parseTiers(b.tiersJson) })))
  }

  // USER sees assigned brands with basic data only
  const brands = await prisma.brand.findMany({
    where: { id: { in: session!.brandIds }, isActive: true },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, feeDefaultPersen: true, tiersJson: true },
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
    { label: 'DANGER', targetMargin: 0 },
    { label: 'Hati Hati', targetMargin: 5 },
    { label: 'Good', targetMargin: 15 },
    { label: 'GAS MAKSIMAL', targetMargin: 25 },
  ])

  const brand = await prisma.brand.create({
    data: { nama, feeDefaultPersen: feeDefaultPersen ?? 18, tiersJson: DEFAULT_TIERS },
  })
  return NextResponse.json({ ...brand, tiers: parseTiers(brand.tiersJson) }, { status: 201 })
}
