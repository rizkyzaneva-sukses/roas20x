import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TierInput {
  label: string
  targetMargin: number
}

interface ProductInput {
  productId?: number
  bundleId?: number
  namaCustom?: string
  hargaJual: number
  feePersen: number
  brandId: number
  tiers: TierInput[]
  roasAktual?: number
}

function hitungROAS(hargaJual: number, hpp: number, feePersen: number, targetMarginPersen: number) {
  const netRevenue = hargaJual * (1 - feePersen / 100)
  const grossProfit = netRevenue - hpp
  if (grossProfit <= 0) return null
  const targetProfit = hargaJual * (targetMarginPersen / 100)
  const denominator = grossProfit - targetProfit
  if (denominator <= 0) return null
  return hargaJual / denominator
}

function getStatus(roasAktual: number, roasBEP: number) {
  const ratio = roasAktual / roasBEP
  if (ratio >= 1.2) return 'safe'
  if (ratio >= 1.0) return 'warn'
  return 'danger'
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { products }: { products: ProductInput[] } = await req.json()
  if (!products?.length) return NextResponse.json({ error: 'Minimal 1 produk' }, { status: 400 })

  const results = await Promise.all(products.map(async (p) => {
    if (!canAccessBrand(session!, p.brandId)) {
      return { error: 'Akses brand ditolak', namaCustom: p.namaCustom }
    }

    let hpp: number
    let namaProduk: string

    if (p.bundleId) {
      // Bundle: HPP = sum of (component hpp * qty)
      const bundle = await prisma.bundle.findFirst({
        where: { id: p.bundleId, brandId: p.brandId, isActive: true },
        select: {
          nama: true,
          items: { include: { product: { select: { hpp: true } } } },
        },
      })
      if (!bundle) return { error: 'Bundle tidak ditemukan', bundleId: p.bundleId }
      hpp = bundle.items.reduce((sum, item) => sum + Number(item.product.hpp) * item.qty, 0)
      namaProduk = bundle.nama
    } else if (p.productId) {
      const product = await prisma.product.findFirst({
        where: { id: p.productId, brandId: p.brandId, isActive: true },
        select: { hpp: true, nama: true },
      })
      if (!product) return { error: 'Produk tidak ditemukan', productId: p.productId }
      hpp = Number(product.hpp)
      namaProduk = product.nama
    } else {
      if (session!.role !== 'OWNER') return { error: 'Staff harus pilih produk dari daftar' }
      hpp = 0
      namaProduk = p.namaCustom ?? 'Produk Custom'
    }

    const bepROAS = hitungROAS(p.hargaJual, hpp, p.feePersen, 0)
    const tierResults = p.tiers.map(tier => ({
      label: tier.label,
      targetMargin: tier.targetMargin,
      roasMinimal: hitungROAS(p.hargaJual, hpp, p.feePersen, tier.targetMargin),
    }))

    const netRevenue = p.hargaJual * (1 - p.feePersen / 100)
    const grossProfit = netRevenue - hpp
    const grossMarginPersen = (grossProfit / p.hargaJual) * 100

    return {
      namaProduk,
      productId: p.productId,
      bundleId: p.bundleId,
      hargaJual: p.hargaJual,
      feePersen: p.feePersen,
      roasBEP: bepROAS,
      grossMarginPersen: Math.round(grossMarginPersen * 10) / 10,
      tiers: tierResults,
      roasAktual: p.roasAktual ?? null,
      statusAktual: p.roasAktual && bepROAS ? getStatus(p.roasAktual, bepROAS) : null,
    }
  }))

  return NextResponse.json(results)
}
