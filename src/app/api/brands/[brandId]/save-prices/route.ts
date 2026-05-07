import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/brands/:brandId/save-prices
// Allows any user with brand access to update hargaJualDefault for products/bundles
// Body: { updates: [{ type: 'produk'|'bundle', id: number, hargaJual: number }] }

export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { updates } = await req.json()
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data untuk disimpan' }, { status: 400 })
  }

  let saved = 0
  const errors: string[] = []

  for (const item of updates) {
    const { type, id, hargaJual } = item
    if (!id || !hargaJual || hargaJual <= 0) {
      errors.push(`Item ${id}: harga tidak valid`)
      continue
    }

    try {
      if (type === 'produk') {
        await prisma.product.update({
          where: { id, brandId: bid },
          data: { hargaJualDefault: BigInt(Math.round(hargaJual)) },
        })
        saved++
      } else if (type === 'bundle') {
        await prisma.bundle.update({
          where: { id, brandId: bid },
          data: { hargaJualDefault: BigInt(Math.round(hargaJual)) },
        })
        saved++
      }
    } catch {
      errors.push(`Item ${type} #${id}: gagal menyimpan`)
    }
  }

  return NextResponse.json({ saved, errors: errors.length > 0 ? errors : undefined })
}
