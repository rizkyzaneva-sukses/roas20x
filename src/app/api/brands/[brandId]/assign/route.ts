import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/brands/:brandId/assign — assign/unassign user
export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error
  const { brandId } = await params
  const { userId, action } = await req.json() // action: 'assign' | 'unassign'
  const bid = parseInt(brandId)
  const uid = parseInt(userId)

  if (action === 'assign') {
    await prisma.userBrand.upsert({
      where: { userId_brandId: { userId: uid, brandId: bid } },
      update: {},
      create: { userId: uid, brandId: bid },
    })
  } else {
    await prisma.userBrand.deleteMany({ where: { userId: uid, brandId: bid } })
  }

  return NextResponse.json({ ok: true })
}
