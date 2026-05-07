'use client'

import { useState, useEffect, useCallback } from 'react'

interface Brand { id: number; nama: string; feeDefaultPersen: number }
interface Product { id: number; nama: string; hargaJualDefault: number }
interface Tier { label: string; targetMargin: number }
interface TierResult { label: string; targetMargin: number; roasMinimal: number | null }
interface CalcResult {
  namaProduk: string
  hargaJual: number
  feePersen: number
  roasBEP: number | null
  grossMarginPersen: number
  tiers: TierResult[]
  roasAktual: number | null
  statusAktual: 'safe' | 'warn' | 'danger' | null
  error?: string
}

interface ProductRow {
  id: string
  brandId: number
  productId: number | null
  hargaJual: string
  feePersen: string
  roasAktual: string
}

const DEFAULT_TIERS: Tier[] = [
  { label: 'BEP', targetMargin: 0 },
  { label: 'Margin Tipis', targetMargin: 5 },
  { label: 'Margin Sedang', targetMargin: 15 },
  { label: 'Margin Tebal', targetMargin: 25 },
]

function fmt(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function fmtROAS(n: number | null) { return n == null ? '—' : n.toFixed(2) + 'x' }

function StatusBadge({ status, roas }: { status: string | null; roas: number | null }) {
  if (!status || roas == null) return null
  const map = {
    safe: { cls: 'bg-green-900/40 border-green-700/50 text-green-400', label: '✅ Profit' },
    warn: { cls: 'bg-yellow-900/40 border-yellow-700/50 text-yellow-400', label: '⚠️ Tipis' },
    danger: { cls: 'bg-red-900/40 border-red-700/50 text-red-400', label: '❌ Rugi' },
  }
  const { cls, label } = map[status as keyof typeof map]
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  )
}

function ROASValue({ val, bep }: { val: number | null; bep: number | null }) {
  if (val == null) return <span className="text-slate-600">—</span>
  if (bep == null) return <span className="text-slate-400">{fmtROAS(val)}</span>
  const cls = val <= bep * 1 ? 'roas-danger' : val <= bep * 1.2 ? 'roas-warn' : 'roas-safe'
  return <span className={cls}>{fmtROAS(val)}</span>
}

export default function CalculatorPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Record<number, Product[]>>({})
  const [rows, setRows] = useState<ProductRow[]>([
    { id: '1', brandId: 0, productId: null, hargaJual: '', feePersen: '18', roasAktual: '' }
  ])
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS)
  const [results, setResults] = useState<CalcResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(setBrands)
  }, [])

  const fetchProducts = useCallback(async (brandId: number) => {
    if (products[brandId]) return
    const res = await fetch(`/api/brands/${brandId}/products`)
    const data = await res.json()
    setProducts(p => ({ ...p, [brandId]: data }))
  }, [products])

  function addRow() {
    setRows(r => [...r, { id: Date.now().toString(), brandId: 0, productId: null, hargaJual: '', feePersen: '18', roasAktual: '' }])
  }

  function removeRow(id: string) {
    setRows(r => r.filter(row => row.id !== id))
  }

  function updateRow(id: string, field: keyof ProductRow, value: string | number) {
    setRows(r => r.map(row => {
      if (row.id !== id) return row
      const updated = { ...row, [field]: value }
      if (field === 'brandId') {
        updated.productId = null
        updated.hargaJual = ''
        const brandId = value as number
        if (brandId) {
          const brand = brands.find(b => b.id === brandId)
          if (brand) updated.feePersen = brand.feeDefaultPersen.toString()
          fetchProducts(brandId)
        }
      }
      if (field === 'productId') {
        const prod = products[row.brandId]?.find(p => p.id === value)
        if (prod) updated.hargaJual = prod.hargaJualDefault.toString()
      }
      return updated
    }))
  }

  function addTier() {
    setTiers(t => [...t, { label: 'Target Baru', targetMargin: 0 }])
  }

  function updateTier(i: number, field: keyof Tier, val: string | number) {
    setTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [field]: val } : tier))
  }

  function removeTier(i: number) {
    setTiers(t => t.filter((_, idx) => idx !== i))
  }

  async function handleHitung() {
    setError('')
    setResults(null)
    const invalid = rows.some(r => !r.brandId || !r.hargaJual || !r.feePersen)
    if (invalid) { setError('Lengkapi semua field produk terlebih dahulu'); return }

    setLoading(true)
    try {
      const payload = {
        products: rows.map(r => ({
          brandId: r.brandId,
          productId: r.productId,
          hargaJual: parseFloat(r.hargaJual),
          feePersen: parseFloat(r.feePersen),
          tiers,
          roasAktual: r.roasAktual ? parseFloat(r.roasAktual) : undefined,
        }))
      }
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResults(data)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function reset() { setResults(null); setError('') }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">📊 Kalkulator ROAS</h1>
        <p className="text-slate-500 text-sm mt-1">Hitung minimum ROAS agar iklan menguntungkan</p>
      </div>

      {/* Produk Rows */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Produk</h2>
          <button onClick={addRow} className="btn-secondary text-xs py-1 px-3">+ Tambah Produk</button>
        </div>

        {rows.map((row, idx) => (
          <div key={row.id} className="bg-[#060d1f] border border-[#162d58] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">PRODUK {idx + 1}</span>
              {rows.length > 1 && (
                <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-400 text-xs">✕ Hapus</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* Brand */}
              <div>
                <label className="label">Brand</label>
                <select
                  className="input"
                  value={row.brandId || ''}
                  onChange={e => updateRow(row.id, 'brandId', parseInt(e.target.value))}
                >
                  <option value="">Pilih Brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                </select>
              </div>

              {/* Produk */}
              <div>
                <label className="label">Produk</label>
                <select
                  className="input"
                  value={row.productId ?? ''}
                  onChange={e => updateRow(row.id, 'productId', e.target.value ? parseInt(e.target.value) : null as unknown as number)}
                  disabled={!row.brandId}
                >
                  <option value="">Pilih Produk</option>
                  {(products[row.brandId] ?? []).map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              {/* Harga Jual */}
              <div>
                <label className="label">Harga Jual (Rp)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="89000"
                  value={row.hargaJual}
                  onChange={e => updateRow(row.id, 'hargaJual', e.target.value)}
                />
              </div>

              {/* Fee */}
              <div>
                <label className="label">Fee Platform (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="18"
                  step="0.1"
                  value={row.feePersen}
                  onChange={e => updateRow(row.id, 'feePersen', e.target.value)}
                />
              </div>
            </div>

            {/* ROAS Aktual */}
            <div className="max-w-xs">
              <label className="label">ROAS Aktual dari Dashboard (opsional)</label>
              <input
                type="number"
                className="input"
                placeholder="contoh: 4.5"
                step="0.1"
                value={row.roasAktual}
                onChange={e => updateRow(row.id, 'roasAktual', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Target Margin Tiers */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Target Margin</h2>
          <button onClick={addTier} className="btn-secondary text-xs py-1 px-3">+ Tambah Tier</button>
        </div>
        <div className="grid gap-2">
          {tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                className="input max-w-[160px]"
                value={tier.label}
                onChange={e => updateTier(i, 'label', e.target.value)}
                placeholder="Label"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input w-20 text-center"
                  value={tier.targetMargin}
                  min={0}
                  max={90}
                  step={0.5}
                  onChange={e => updateTier(i, 'targetMargin', parseFloat(e.target.value) || 0)}
                />
                <span className="text-slate-400 text-sm">%</span>
              </div>
              {i > 0 && (
                <button onClick={() => removeTier(i)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
      <div className="flex gap-3">
        <button onClick={handleHitung} className="btn-primary px-8" disabled={loading}>
          {loading ? 'Menghitung...' : '🔢 Hitung ROAS'}
        </button>
        {results && <button onClick={reset} className="btn-secondary">Reset</button>}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Hasil Kalkulasi</h2>
          {results.map((r, i) => (
            <div key={i} className="card space-y-4">
              {r.error ? (
                <div className="text-red-400 text-sm">⚠️ {r.error}</div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{r.namaProduk}</h3>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {fmt(r.hargaJual)} · Fee {r.feePersen}% · Gross Margin {r.grossMarginPersen}%
                      </div>
                    </div>
                    {r.roasAktual != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">ROAS Aktual:</span>
                        <span className="text-lg font-bold text-slate-100">{fmtROAS(r.roasAktual)}</span>
                        <StatusBadge status={r.statusAktual} roas={r.roasAktual} />
                      </div>
                    )}
                  </div>

                  {/* ROAS Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#162d58]">
                          <th className="text-left py-2 px-3 text-slate-500 text-xs font-semibold uppercase">Tier</th>
                          <th className="text-center py-2 px-3 text-slate-500 text-xs font-semibold uppercase">Target Margin</th>
                          <th className="text-center py-2 px-3 text-slate-500 text-xs font-semibold uppercase">ROAS Minimal</th>
                          {r.roasAktual != null && (
                            <th className="text-center py-2 px-3 text-slate-500 text-xs font-semibold uppercase">Status</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {r.tiers.map((tier, ti) => {
                          const isActualOk = r.roasAktual != null && tier.roasMinimal != null && r.roasAktual >= tier.roasMinimal
                          return (
                            <tr key={ti} className="border-b border-[#162d58]/40 hover:bg-[#162d58]/20">
                              <td className="py-3 px-3 font-semibold text-slate-200">{tier.label}</td>
                              <td className="py-3 px-3 text-center text-slate-400">
                                {tier.targetMargin === 0 ? 'BEP' : `${tier.targetMargin}%`}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <ROASValue val={tier.roasMinimal} bep={r.roasBEP} />
                              </td>
                              {r.roasAktual != null && (
                                <td className="py-3 px-3 text-center">
                                  {tier.roasMinimal == null ? (
                                    <span className="text-slate-600 text-xs">N/A</span>
                                  ) : isActualOk ? (
                                    <span className="text-green-400 text-xs font-bold">✅ Tercapai</span>
                                  ) : (
                                    <span className="text-red-400 text-xs font-bold">❌ Belum</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Insight */}
                  {r.roasBEP != null && r.roasAktual != null && (
                    <div className={`text-xs px-4 py-3 rounded-lg border ${
                      r.statusAktual === 'safe' ? 'bg-green-900/20 border-green-800/40 text-green-400' :
                      r.statusAktual === 'warn' ? 'bg-yellow-900/20 border-yellow-800/40 text-yellow-400' :
                      'bg-red-900/20 border-red-800/40 text-red-400'
                    }`}>
                      {r.statusAktual === 'safe' && `✅ ROAS aktual ${fmtROAS(r.roasAktual)} sudah di atas BEP ${fmtROAS(r.roasBEP)} — iklan ini menguntungkan.`}
                      {r.statusAktual === 'warn' && `⚠️ ROAS aktual ${fmtROAS(r.roasAktual)} tipis di atas BEP ${fmtROAS(r.roasBEP)} — perlu dimonitor ketat.`}
                      {r.statusAktual === 'danger' && `❌ ROAS aktual ${fmtROAS(r.roasAktual)} di bawah BEP ${fmtROAS(r.roasBEP)} — iklan ini sedang merugi.`}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
