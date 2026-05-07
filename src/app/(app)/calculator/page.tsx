'use client'

import { useState, useEffect, useCallback } from 'react'

interface Brand { id: number; nama: string; feeDefaultPersen: number; tiers: Tier[] }
interface Product { id: number; nama: string; hargaJualDefault: number }
interface Bundle { id: number; nama: string; hargaJualDefault: number }
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
  bundleId: number | null
  hargaJual: string
  feePersen: string
  roasAktual: string
}

const DEFAULT_TIERS: Tier[] = [
  { label: 'BEP', targetMargin: 0 },
  { label: 'Margin Tipis', targetMargin: 5 },
  { label: 'Margin Sedang', targetMargin: 15 },
  { label: 'Proporsional', targetMargin: 25 },
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
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
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
  const [bundles, setBundles] = useState<Record<number, Bundle[]>>({})
  const [rows, setRows] = useState<ProductRow[]>([
    { id: '1', brandId: 0, productId: null, bundleId: null, hargaJual: '', feePersen: '18', roasAktual: '' }
  ])
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'USER' | null>(null)

  // Tiers state: which brand's tiers are displayed, and the editable copy
  const [tiersBrandId, setTiersBrandId] = useState<number | null>(null)
  const [editTiers, setEditTiers] = useState<Tier[]>(DEFAULT_TIERS)
  const [tierSaving, setTierSaving] = useState(false)
  const [tierSaved, setTierSaved] = useState(false)

  const [results, setResults] = useState<CalcResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/session').then(r => r.json()),
      fetch('/api/brands').then(r => r.json()),
    ]).then(([sess, brandsData]) => {
      if (sess.role) setRole(sess.role)
      if (Array.isArray(brandsData)) {
        setBrands(brandsData.map((b: Brand) => ({ ...b, tiers: b.tiers?.length ? b.tiers : DEFAULT_TIERS })))
      }
    })
  }, [])

  const fetchProducts = useCallback(async (brandId: number) => {
    if (products[brandId]) return
    const [prodRes, bundleRes] = await Promise.all([
      fetch(`/api/brands/${brandId}/products`),
      fetch(`/api/brands/${brandId}/bundles`),
    ])
    const [prodData, bundleData] = await Promise.all([prodRes.json(), bundleRes.json()])
    setProducts(p => ({ ...p, [brandId]: prodData }))
    setBundles(b => ({ ...b, [brandId]: Array.isArray(bundleData) ? bundleData : [] }))
  }, [products])

  function getBrandTiers(brandId: number): Tier[] {
    if (brandId === tiersBrandId) return editTiers
    return brands.find(b => b.id === brandId)?.tiers ?? DEFAULT_TIERS
  }

  function addRow() {
    setRows(r => [...r, { id: Date.now().toString(), brandId: 0, productId: null, bundleId: null, hargaJual: '', feePersen: '18', roasAktual: '' }])
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
        updated.bundleId = null
        updated.hargaJual = ''
        const brandId = value as number
        if (brandId) {
          const brand = brands.find(b => b.id === brandId)
          if (brand) updated.feePersen = brand.feeDefaultPersen.toString()
          fetchProducts(brandId)
          if (!tiersBrandId) {
            setTiersBrandId(brandId)
            setEditTiers(brand?.tiers ?? DEFAULT_TIERS)
          }
        }
      }
      if (field === 'productId') {
        updated.bundleId = null
        const prod = products[row.brandId]?.find(p => p.id === value)
        if (prod) updated.hargaJual = prod.hargaJualDefault.toString()
      }
      if (field === 'bundleId') {
        updated.productId = null
        const bundle = bundles[row.brandId]?.find(b => b.id === value)
        if (bundle) updated.hargaJual = bundle.hargaJualDefault.toString()
      }
      return updated
    }))
  }

  function switchTierBrand(brandId: number) {
    const brand = brands.find(b => b.id === brandId)
    setTiersBrandId(brandId)
    setEditTiers(brand?.tiers ?? DEFAULT_TIERS)
    setTierSaved(false)
  }

  function addTier() {
    setEditTiers(t => [...t, { label: 'Target Baru', targetMargin: 0 }])
    setTierSaved(false)
  }

  function updateTier(i: number, field: keyof Tier, val: string | number) {
    setEditTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [field]: val } : tier))
    setTierSaved(false)
  }

  function removeTier(i: number) {
    setEditTiers(t => t.filter((_, idx) => idx !== i))
    setTierSaved(false)
  }

  async function saveTiers() {
    if (!tiersBrandId) return
    setTierSaving(true)
    try {
      const res = await fetch(`/api/brands/${tiersBrandId}/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: editTiers }),
      })
      if (res.ok) {
        setBrands(prev => prev.map(b => b.id === tiersBrandId ? { ...b, tiers: editTiers } : b))
        setTierSaved(true)
      }
    } finally {
      setTierSaving(false)
    }
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
          productId: r.productId ?? undefined,
          bundleId: r.bundleId ?? undefined,
          hargaJual: parseFloat(r.hargaJual),
          feePersen: parseFloat(r.feePersen),
          tiers: getBrandTiers(r.brandId),
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

  // Brands yang sedang dipilih di rows (untuk switch tier brand)
  const selectedBrandIds = [...new Set(rows.map(r => r.brandId).filter(Boolean))]
  const tiersBrand = brands.find(b => b.id === tiersBrandId)

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

              <div>
                <label className="label">Produk / Bundle</label>
                <select
                  className="input"
                  value={row.bundleId ? `b_${row.bundleId}` : row.productId ? `p_${row.productId}` : ''}
                  onChange={e => {
                    const val = e.target.value
                    if (!val) { updateRow(row.id, 'productId', null as unknown as number); return }
                    if (val.startsWith('b_')) updateRow(row.id, 'bundleId', parseInt(val.slice(2)))
                    else updateRow(row.id, 'productId', parseInt(val.slice(2)))
                  }}
                  disabled={!row.brandId}
                >
                  <option value="">Pilih Produk / Bundle</option>
                  {(products[row.brandId] ?? []).length > 0 && (
                    <optgroup label="Produk">
                      {(products[row.brandId] ?? []).map(p => (
                        <option key={`p_${p.id}`} value={`p_${p.id}`}>{p.nama}</option>
                      ))}
                    </optgroup>
                  )}
                  {(bundles[row.brandId] ?? []).length > 0 && (
                    <optgroup label="Bundle">
                      {(bundles[row.brandId] ?? []).map(b => (
                        <option key={`b_${b.id}`} value={`b_${b.id}`}>📦 {b.nama}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

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

      {/* Target Margin Tiers - hidden for USER role */}
      {role !== 'USER' && <div className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Target Margin</h2>
            {tiersBrand && (
              <span className="text-xs text-[#e85d26] font-semibold">{tiersBrand.nama}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Switch brand for tiers (if multiple brands selected) */}
            {selectedBrandIds.length > 1 && (
              <select
                className="input text-xs py-1 px-2"
                value={tiersBrandId ?? ''}
                onChange={e => switchTierBrand(parseInt(e.target.value))}
              >
                {selectedBrandIds.map(id => {
                  const b = brands.find(x => x.id === id)
                  return <option key={id} value={id}>{b?.nama ?? id}</option>
                })}
              </select>
            )}
            {role === 'OWNER' && (
              <button onClick={addTier} className="btn-secondary text-xs py-1 px-3">+ Tambah Tier</button>
            )}
          </div>
        </div>

        {/* OWNER: editable tiers */}
        {role === 'OWNER' ? (
          <>
            <div className="grid gap-2">
              {editTiers.map((tier, i) => (
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
            {tiersBrandId && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveTiers}
                  disabled={tierSaving || tierSaved}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {tierSaving ? 'Menyimpan...' : tierSaved ? '✅ Tersimpan' : `Simpan Tier ke ${tiersBrand?.nama ?? ''}`}
                </button>
                <span className="text-xs text-slate-500">Berlaku untuk semua user brand ini</span>
              </div>
            )}
            {!tiersBrandId && (
              <p className="text-xs text-slate-500">Pilih brand di atas untuk mengaktifkan simpan tier</p>
            )}
          </>
        ) : (
          /* Non-owner: read-only tiers */
          <div className="flex flex-wrap gap-2">
            {editTiers.map((tier, i) => (
              <div key={i} className="bg-[#0a1628] border border-[#162d58] rounded-lg px-3 py-2 text-center min-w-[90px]">
                <p className="text-xs text-slate-500 mb-0.5">{tier.label}</p>
                <p className="text-sm font-bold text-slate-200">
                  {tier.targetMargin === 0 ? 'BEP' : `${tier.targetMargin}%`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>}

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

                  {r.roasBEP != null && r.roasAktual != null && (
                    <div className={`text-xs px-4 py-3 rounded-lg border ${r.statusAktual === 'safe' ? 'bg-green-900/20 border-green-800/40 text-green-400' :
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
