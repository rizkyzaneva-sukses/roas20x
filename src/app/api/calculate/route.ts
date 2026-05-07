import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TierInput {
  label: string
  targetMargin: number // persen
}

interface ProductInput {
  productId?: number        // jika dari DB
  namaCustom?: string       // jika manual input
  hargaJual: number
  feePersen: number
  brandId: number
  tiers: TierInput[]
  roasAktual?: number
}

function hitungROAS(hargaJual: number, hpp: number, feePersen: number, targetMarginPersen: number) {
  const netRevenue = hargaJual * (1 - feePersen / 100)
  const grossProfit = netRevenue - hpp
  if (grossProfit <= 0) return null // tidak bisa untung
  const targetProfit = hargaJual * (targetMarginPersen / 100)
  const denominator = grossProfit - targetProfit
  if (denominator <= 0) return null // margin tidak tercapai
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

    if (p.productId) {
      // Ambil HPP dari DB - tidak pernah dikirim ke client
      const product = await prisma.product.findFirst({
        where: { id: p.productId, brandId: p.brandId, isActive: true },
        select: { hpp: true, nama: true },
      })
      if (!product) return { error: 'Produk tidak ditemukan', productId: p.productId }
      hpp = Number(product.hpp)
      namaProduk = product.nama
    } else {
      // Manual input (OWNER only untuk keamanan — karena HPP diisi sendiri)
      if (session!.role !== 'OWNER') {
        return { error: 'Staff harus pilih produk dari daftar' }
      }
      hpp = p.productId ?? 0
      namaProduk = p.namaCustom ?? 'Produk Custom'
    }

    const bepROAS = hitungROAS(p.hargaJual, hpp, p.feePersen, 0)
    const tierResults = p.tiers.map(tier => ({
      label: tier.label,
      targetMargin: tier.targetMargin,
      roasMinimal: hitungROAS(p.hargaJual, hpp, p.feePersen, tier.targetMargin),
    }))

    // Net per unit (tanpa expose HPP)
    const netRevenue = p.hargaJual * (1 - p.feePersen / 100)
    const grossProfit = netRevenue - hpp
    const grossMarginPersen = (grossProfit / p.hargaJual) * 100

    return {
      namaProduk,
      productId: p.productId,
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
