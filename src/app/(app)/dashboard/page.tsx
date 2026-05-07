'use client'

import { useState, useEffect, useCallback } from 'react'

interface Tier { label: string; targetMargin: number }
interface Brand { id: number; nama: string; feeDefaultPersen: number; tiers: Tier[] }
interface Product { id: number; nama: string; hpp: number; hargaJualDefault: number }
interface Bundle { id: number; nama: string; hargaJualDefault: number; hpp: number }

interface RowData {
  nama: string
  type: 'produk' | 'bundle'
  hargaJual: number
  hpp: number
  feePersen: number
  roasValues: (number | null)[] // one per tier
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

const DEFAULT_TIERS: Tier[] = [
  { label: 'BEP', targetMargin: 0 },
  { label: 'Margin Tipis', targetMargin: 5 },
  { label: 'Margin Sedang', targetMargin: 15 },
  { label: 'Proporsional', targetMargin: 25 },
]

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<{ nama: string; role: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/session').then(r => r.json()),
      fetch('/api/brands').then(r => r.json()),
    ]).then(([sess, brandsData]) => {
      setSession(sess)
      if (Array.isArray(brandsData)) {
        const mapped = brandsData.map((b: Brand) => ({
          ...b,
          tiers: b.tiers?.length ? b.tiers : DEFAULT_TIERS,
        }))
        setBrands(mapped)
        if (mapped.length > 0) setSelectedBrandId(mapped[0].id)
      }
      setLoading(false)
    })
  }, [])

  const fetchBrandData = useCallback(async (brandId: number) => {
    const [prodRes, bundleRes] = await Promise.all([
      fetch(`/api/brands/${brandId}/products`),
      fetch(`/api/brands/${brandId}/bundles`),
    ])
    const [prodData, bundleData] = await Promise.all([prodRes.json(), bundleRes.json()])
    setProducts(Array.isArray(prodData) ? prodData : [])
    setBundles(Array.isArray(bundleData) ? bundleData : [])
  }, [])

  useEffect(() => {
    if (selectedBrandId) {
      fetchBrandData(selectedBrandId)
    }
  }, [selectedBrandId, fetchBrandData])

  const selectedBrand = brands.find(b => b.id === selectedBrandId)
  const tiers = selectedBrand?.tiers ?? DEFAULT_TIERS
  const feePersen = selectedBrand?.feeDefaultPersen ?? 18

  // Build table rows
  const rows: RowData[] = [
    ...products.map(p => ({
      nama: p.nama,
      type: 'produk' as const,
      hargaJual: p.hargaJualDefault,
      hpp: p.hpp,
      feePersen,
      roasValues: tiers.map(t => hitungROAS(p.hargaJualDefault, p.hpp, feePersen, t.targetMargin)),
    })),
    ...bundles.map(b => ({
      nama: `🎁 ${b.nama}`,
      type: 'bundle' as const,
      hargaJual: b.hargaJualDefault,
      hpp: b.hpp ?? 0,
      feePersen,
      roasValues: tiers.map(t => hitungROAS(b.hargaJualDefault, b.hpp ?? 0, feePersen, t.targetMargin)),
    })),
  ]

  // Filter by search
  const filtered = search.trim()
    ? rows.filter(r => r.nama.toLowerCase().includes(search.toLowerCase()))
    : rows

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <p className="text-slate-500">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">🏠 Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Selamat datang, {session?.nama}</p>
      </div>

      {/* Controls: Brand selector + Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold uppercase">Brand:</label>
            <select
              className="input text-sm py-1.5 px-3 min-w-[160px]"
              value={selectedBrandId ?? ''}
              onChange={e => setSelectedBrandId(parseInt(e.target.value))}
            >
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              className="input text-sm py-1.5 px-3 w-full"
              placeholder="🔍 Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-500">
            {filtered.length} dari {rows.length} item
          </div>
        </div>
      </div>

      {/* Product ROAS Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#060d1f] border-b border-[#162d58]">
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-[#060d1f] z-10">
                  Produk
                </th>
                {tiers.map((tier, i) => (
                  <th key={i} className="text-center py-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <div>{tier.label}</div>
                    <div className="text-[10px] text-slate-600 font-normal">
                      {tier.targetMargin === 0 ? 'BEP' : `${tier.targetMargin}%`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={tiers.length + 1} className="text-center py-8 text-slate-600">
                    {rows.length === 0 ? 'Belum ada produk di brand ini.' : 'Tidak ada produk yang cocok.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#162d58]/40 hover:bg-[#162d58]/20 transition-colors">
                    <td className="py-2.5 px-4 text-slate-200 font-medium sticky left-0 bg-[#0a1628] z-10">
                      <div className="max-w-[250px] truncate" title={row.nama}>{row.nama}</div>
                      <div className="text-[10px] text-slate-600">
                        Jual: Rp {row.hargaJual.toLocaleString('id-ID')}
                      </div>
                    </td>
                    {row.roasValues.map((roas, i) => (
                      <td key={i} className="text-center py-2.5 px-3">
                        {roas != null ? (
                          <span className={`font-bold text-sm ${
                            i === 0 ? 'text-red-400' :
                            i === 1 ? 'text-yellow-400' :
                            i === 2 ? 'text-blue-400' :
                            'text-green-400'
                          }`}>
                            {roas.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400/20 border border-red-400/50"></span> BEP (Break Even)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400/50"></span> Margin Tipis</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400/20 border border-blue-400/50"></span> Margin Sedang</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400/20 border border-green-400/50"></span> Proporsional</span>
      </div>
    </div>
  )
}
