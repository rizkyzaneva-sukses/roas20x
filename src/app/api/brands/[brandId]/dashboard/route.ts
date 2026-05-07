import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/brands/:brandId/dashboard
// Returns products + bundles with pre-calculated ROAS values per tier
// Available to all roles (HPP is NOT exposed, only ROAS values)

function parseTiers(tiersJson: string) {
  try { return JSON.parse(tiersJson) } catch { return [] }
}

function hitungROAS(hargaJual: number, hpp: number, feePersen: number, targetMarginPersen: number): number | null {
  const netRevenue = hargaJual * (1 - feePersen / 100)
  const grossProfit = netRevenue - hpp
  if (grossProfit <= 0) return null
  const targetProfit = hargaJual * (targetMarginPersen / 100)
  const denominator = grossProfit - targetProfit
  if (denominator <= 0) return null
  return Math.round((hargaJual / denominator) * 100) / 100
}

const DEFAULT_TIERS = [
  { label: 'DANGER', targetMargin: 0 },
  { label: 'Hati Hati', targetMargin: 5 },
  { label: 'Good', targetMargin: 15 },
  { label: 'GAS MAKSIMAL', targetMargin: 25 },
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // Get brand with tiers
  const brand = await prisma.brand.findUnique({
    where: { id: bid },
    select: { feeDefaultPersen: true, tiersJson: true },
  })
  if (!brand) return NextResponse.json({ error: 'Brand tidak ditemukan' }, { status: 404 })

  const feePersen = brand.feeDefaultPersen
  const tiers: { label: string; targetMargin: number }[] = parseTiers(brand.tiersJson)
  const activeTiers = tiers.length > 0 ? tiers : DEFAULT_TIERS

  // Get products
  const products = await prisma.product.findMany({
    where: { brandId: bid, isActive: true },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, hpp: true, hargaJualDefault: true },
  })

  // Get bundles with items
  const bundles = await prisma.bundle.findMany({
    where: { brandId: bid, isActive: true },
    orderBy: { nama: 'asc' },
    include: {
      items: { include: { product: { select: { hpp: true } } } },
    },
  })

  // Calculate ROAS for products
  const productRows = products.map(p => {
    const hpp = Number(p.hpp)
    const hargaJual = Number(p.hargaJualDefault)
    return {
      id: p.id,
      nama: p.nama,
      type: 'produk' as const,
      hargaJual,
      roasValues: activeTiers.map(t => hitungROAS(hargaJual, hpp, feePersen, t.targetMargin)),
    }
  })

  // Calculate ROAS for bundles
  const bundleRows = bundles.map(b => {
    const hpp = b.items.reduce((sum: number, item: { product: { hpp: bigint }; qty: number }) => sum + Number(item.product.hpp) * item.qty, 0)
    const hargaJual = Number(b.hargaJualDefault)
    return {
      id: b.id,
      nama: b.nama,
      type: 'bundle' as const,
      hargaJual,
      roasValues: activeTiers.map(t => hitungROAS(hargaJual, hpp, feePersen, t.targetMargin)),
    }
  })

  return NextResponse.json({
    tiers: activeTiers,
    feePersen,
    items: [...productRows, ...bundleRows],
  })
}
