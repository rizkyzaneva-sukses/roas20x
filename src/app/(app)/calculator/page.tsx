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
  { label: 'DANGER', targetMargin: 0 },
  { label: 'Hati Hati', targetMargin: 5 },
  { label: 'Good', targetMargin: 15 },
  { label: 'GAS MAKSIMAL', targetMargin: 25 },
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

  // Per-row editing state for results table
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null)
  const [editHargaJual, setEditHargaJual] = useState('')
  const [rowLoading, setRowLoading] = useState<number | null>(null)
  const [rowSaving, setRowSaving] = useState<number | null>(null)

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
      setEditingRowIdx(null)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function reset() { setResults(null); setError(''); setEditingRowIdx(null) }

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function handleSaveHarga() {
    // Group rows by brandId and save hargaJual for each product/bundle
    const updatesByBrand: Record<number, { type: string; id: number; hargaJual: number }[]> = {}
    for (const row of rows) {
      if (!row.brandId || !row.hargaJual) continue
      if (!row.productId && !row.bundleId) continue
      if (!updatesByBrand[row.brandId]) updatesByBrand[row.brandId] = []
      updatesByBrand[row.brandId].push({
        type: row.bundleId ? 'bundle' : 'produk',
        id: (row.bundleId ?? row.productId)!,
        hargaJual: parseFloat(row.hargaJual),
      })
    }

    if (Object.keys(updatesByBrand).length === 0) {
      setSaveMsg('⚠️ Tidak ada produk yang bisa disimpan')
      setTimeout(() => setSaveMsg(''), 3000)
      return
    }

    setSaving(true)
    setSaveMsg('')
    let totalSaved = 0
    try {
      for (const [brandId, updates] of Object.entries(updatesByBrand)) {
        const res = await fetch(`/api/brands/${brandId}/save-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        })
        const data = await res.json()
        if (data.saved) totalSaved += data.saved
      }
      setSaveMsg(`✅ ${totalSaved} harga berhasil disimpan ke dashboard`)
    } catch {
      setSaveMsg('❌ Gagal menyimpan harga')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 4000)
  }

  // Save single row's harga
  async function handleSaveRow(idx: number) {
    const row = rows[idx]
    if (!row || !row.brandId || !row.hargaJual) return
    if (!row.productId && !row.bundleId) return

    setRowSaving(idx)
    try {
      const updates = [{
        type: row.bundleId ? 'bundle' : 'produk',
        id: (row.bundleId ?? row.productId)!,
        hargaJual: parseFloat(row.hargaJual),
      }]
      const res = await fetch(`/api/brands/${row.brandId}/save-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (data.saved) {
        setSaveMsg(`✅ Harga ${results?.[idx]?.namaProduk ?? 'produk'} tersimpan`)
        setTimeout(() => setSaveMsg(''), 3000)
      }
    } catch {
      setSaveMsg('❌ Gagal menyimpan')
      setTimeout(() => setSaveMsg(''), 3000)
    }
    setRowSaving(null)
  }

  // Recalculate single row
  async function handleCalcRow(idx: number) {
    const row = rows[idx]
    if (!row || !row.brandId || !row.hargaJual || !row.feePersen) return

    setRowLoading(idx)
    try {
      const payload = {
        products: [{
          brandId: row.brandId,
          productId: row.productId ?? undefined,
          bundleId: row.bundleId ?? undefined,
          hargaJual: parseFloat(row.hargaJual),
          feePersen: parseFloat(row.feePersen),
          tiers: getBrandTiers(row.brandId),
          roasAktual: row.roasAktual ? parseFloat(row.roasAktual) : undefined,
        }]
      }
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data[0]) {
        setResults(prev => prev ? prev.map((r, i) => i === idx ? data[0] : r) : prev)
      }
    } catch { /* ignore */ }
    setRowLoading(null)
    setEditingRowIdx(null)
  }

  // Start editing a row's harga
  function startEditRow(idx: number) {
    setEditingRowIdx(idx)
    setEditHargaJual(rows[idx]?.hargaJual ?? '')
  }

  // Confirm edit: update the row's hargaJual
  function confirmEditRow(idx: number) {
    const row = rows[idx]
    if (row && editHargaJual) {
      updateRow(row.id, 'hargaJual', editHargaJual)
    }
    setEditingRowIdx(null)
  }

  // Brands yang sedang dipilih di rows (untuk switch tier brand)
  const selectedBrandIds = [...new Set(rows.map(r => r.brandId).filter(Boolean))]
  const tiersBrand = brands.find(b => b.id === tiersBrandId)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* Target Margin Tiers - HIDDEN (managed in Brand Management page) */}

      {/* Action */}
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleHitung} className="btn-primary px-8" disabled={loading}>
          {loading ? 'Menghitung...' : '🔢 Hitung ROAS'}
        </button>
        <button onClick={handleSaveHarga} className="btn-secondary px-6" disabled={saving}>
          {saving ? 'Menyimpan...' : '💾 Simpan Semua Harga'}
        </button>
        {results && <button onClick={reset} className="btn-secondary">Reset</button>}
        {saveMsg && <span className="text-xs text-slate-300">{saveMsg}</span>}
      </div>

      {/* Results - Compact Table */}
      {results && (
        <div className="card space-y-3 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Hasil Kalkulasi</h2>
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#162d58] bg-[#060d1f]">
                  <th className="text-left py-2.5 px-3 text-slate-500 text-xs font-semibold uppercase sticky left-0 bg-[#060d1f] z-10">Produk</th>
                  <th className="text-center py-2.5 px-3 text-slate-500 text-xs font-semibold uppercase whitespace-nowrap">Harga Jual</th>
                  <th className="text-center py-2.5 px-3 text-slate-500 text-xs font-semibold uppercase whitespace-nowrap">
                    Harga Bersih
                    <div className="text-[10px] font-normal text-slate-600">setelah fee</div>
                  </th>
                  {results[0] && !results[0].error && results[0].tiers.map((tier, i) => (
                    <th key={i} className="text-center py-2.5 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {tier.label}
                      <div className="text-[10px] font-normal text-slate-600">{tier.targetMargin}%</div>
                    </th>
                  ))}
                  <th className="text-center py-2.5 px-3 text-slate-500 text-xs font-semibold uppercase whitespace-nowrap">Status</th>
                  <th className="text-center py-2.5 px-2 text-slate-500 text-xs font-semibold uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-[#162d58]/40 hover:bg-[#162d58]/20 transition-colors">
                    {r.error ? (
                      <td colSpan={99} className="py-2.5 px-3 text-red-400 text-sm">⚠️ {r.error}</td>
                    ) : (
                      <>
                        {/* Product Name */}
                        <td className="py-2.5 px-3 text-slate-200 font-medium sticky left-0 bg-[#0a1628] z-10 whitespace-nowrap">
                          <div>{r.namaProduk}</div>
                          <div className="text-[10px] text-slate-500">Fee {r.feePersen}% · GM {r.grossMarginPersen}%</div>
                        </td>

                        {/* Harga Jual (editable) */}
                        <td className="py-2.5 px-3 text-center">
                          {editingRowIdx === i ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                className="input w-24 text-xs py-1 px-2 text-center"
                                value={editHargaJual}
                                onChange={e => setEditHargaJual(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') confirmEditRow(i) }}
                                autoFocus
                              />
                              <button onClick={() => confirmEditRow(i)} className="text-green-400 text-xs font-bold">✓</button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs whitespace-nowrap">{fmt(r.hargaJual)}</span>
                          )}
                        </td>

                        {/* Harga Bersih (Net Revenue) */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-emerald-400 text-xs whitespace-nowrap font-medium">
                            {fmt(Math.round(r.hargaJual * (1 - r.feePersen / 100)))}
                          </span>
                        </td>

                        {/* ROAS per tier */}
                        {r.tiers.map((tier, ti) => (
                          <td key={ti} className="text-center py-2.5 px-2">
                            <ROASValue val={tier.roasMinimal} bep={r.roasBEP} />
                          </td>
                        ))}

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {r.roasAktual != null ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs text-slate-400">{fmtROAS(r.roasAktual)}</span>
                              <StatusBadge status={r.statusAktual} roas={r.roasAktual} />
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => startEditRow(i)}
                              className="text-[10px] px-1.5 py-1 rounded bg-blue-900/40 border border-blue-700/50 text-blue-400 hover:bg-blue-900/60 whitespace-nowrap"
                              title="Edit Harga"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleCalcRow(i)}
                              disabled={rowLoading === i}
                              className="text-[10px] px-1.5 py-1 rounded bg-yellow-900/40 border border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/60 whitespace-nowrap"
                              title="Hitung Ulang"
                            >
                              {rowLoading === i ? '⏳' : '🔄'}
                            </button>
                            <button
                              onClick={() => handleSaveRow(i)}
                              disabled={rowSaving === i}
                              className="text-[10px] px-1.5 py-1 rounded bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 whitespace-nowrap"
                              title="Simpan Harga"
                            >
                              {rowSaving === i ? '⏳' : '💾'}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend + Save button */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] text-slate-500 border-t border-[#162d58]/40">
            <span>✏️ Edit Harga</span>
            <span>🔄 Hitung Ulang Baris</span>
            <span>💾 Simpan Harga ke DB</span>
            <span className="ml-auto">ROAS: <span className="roas-danger">Rugi</span> · <span className="roas-warn">Tipis</span> · <span className="roas-safe">Profit</span></span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSaveHarga} className="btn-primary text-xs py-2 px-5" disabled={saving}>
              {saving ? 'Menyimpan...' : '💾 Simpan Semua Harga'}
            </button>
            {saveMsg && <span className="text-xs text-slate-300">{saveMsg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
