'use client'

import { useState, useEffect, useCallback } from 'react'

interface Tier { label: string; targetMargin: number }
interface Brand { id: number; nama: string; feeDefaultPersen: number; tiers: Tier[] }
interface DashboardItem {
  id: number
  nama: string
  type: 'produk' | 'bundle'
  hargaJual: number
  roasValues: (number | null)[]
}

const ITEMS_PER_PAGE = 15

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [items, setItems] = useState<DashboardItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [session, setSession] = useState<{ nama: string; role: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/session').then(r => r.json()),
      fetch('/api/brands').then(r => r.json()),
    ]).then(([sess, brandsData]) => {
      setSession(sess)
      if (Array.isArray(brandsData)) {
        setBrands(brandsData)
        if (brandsData.length > 0) setSelectedBrandId(brandsData[0].id)
      }
      setLoading(false)
    })
  }, [])

  const fetchDashboard = useCallback(async (brandId: number) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/dashboard`)
      const data = await res.json()
      if (data.tiers) setTiers(data.tiers)
      if (data.items) setItems(data.items)
    } catch {
      setItems([])
    }
    setLoadingItems(false)
  }, [])

  useEffect(() => {
    if (selectedBrandId) {
      fetchDashboard(selectedBrandId)
      setPage(1)
      setSearch('')
    }
  }, [selectedBrandId, fetchDashboard])

  // Filter by search
  const filtered = search.trim()
    ? items.filter(r => r.nama.toLowerCase().includes(search.toLowerCase()))
    : items

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when search changes
  useEffect(() => { setPage(1) }, [search])

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
        <p className="text-slate-500 text-sm mt-1">Selamat datang, {session?.nama} — Kamus ROAS Produk</p>
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
          <div className="text-xs text-slate-500 whitespace-nowrap">
            {filtered.length} dari {items.length} item
          </div>
        </div>
      </div>

      {/* Product ROAS Table */}
      <div className="card p-0 overflow-hidden">
        {loadingItems ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500 text-sm">Memuat produk...</p>
          </div>
        ) : (
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
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={tiers.length + 1} className="text-center py-8 text-slate-600">
                      {items.length === 0 ? 'Belum ada produk di brand ini.' : 'Tidak ada produk yang cocok.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((row, idx) => (
                    <tr key={`${row.type}-${row.id}-${idx}`} className="border-b border-[#162d58]/40 hover:bg-[#162d58]/20 transition-colors">
                      <td className="py-2.5 px-4 text-slate-200 font-medium sticky left-0 bg-[#0a1628] z-10">
                        <div className="max-w-[280px] truncate" title={row.nama}>
                          {row.type === 'bundle' ? '🎁 ' : ''}{row.nama}
                        </div>
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
                              {roas.toFixed(2)}x
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#162d58]">
            <p className="text-xs text-slate-500">
              Halaman {page} dari {totalPages} ({filtered.length} item)
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1 text-xs rounded bg-[#162d58] text-slate-300 disabled:opacity-40 hover:bg-[#1e3a6e]">←</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`px-2.5 py-1 text-xs rounded ${pageNum === page ? 'bg-[#e85d26] text-white' : 'bg-[#162d58] text-slate-300 hover:bg-[#1e3a6e]'}`}>
                    {pageNum}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1 text-xs rounded bg-[#162d58] text-slate-300 disabled:opacity-40 hover:bg-[#1e3a6e]">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400/20 border border-red-400/50"></span> BEP (Break Even)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400/50"></span> Margin Tipis</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400/20 border border-blue-400/50"></span> Margin Sedang</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400/20 border border-green-400/50"></span> Proporsional</span>
        <span className="text-slate-600 ml-auto">* Nilai = ROAS minimal agar iklan menguntungkan</span>
      </div>
    </div>
  )
}
