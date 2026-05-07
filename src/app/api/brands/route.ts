import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/brands — OWNER: semua brand | STAFF: brand yang di-assign
export async function GET() {
  const { session, error } = await requireOwner()
  // Jika bukan owner, fallback ke session biasa tapi ambil brand yang diassign
  if (error) {
    const { getSession } = await import('@/lib/auth')
    const sess = await getSession()
    if (!sess.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const brands = await prisma.brand.findMany({
      where: { id: { in: sess.brandIds }, isActive: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, feeDefaultPersen: true },
    })
    return NextResponse.json(brands)
  }

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { nama: 'asc' },
    include: {
      _count: { select: { products: { where: { isActive: true } }, users: true } },
    },
  })
  return NextResponse.json(brands)
}

// POST /api/brands — OWNER only
export async function POST(req: NextRequest) {
  const { error } = await requireOwner()
  if (error) return error

  const { nama, feeDefaultPersen } = await req.json()
  if (!nama) return NextResponse.json({ error: 'Nama brand wajib diisi' }, { status: 400 })

  const brand = await prisma.brand.create({
    data: { nama, feeDefaultPersen: feeDefaultPersen ?? 18 },
  })
  return NextResponse.json(brand, { status: 201 })
}
