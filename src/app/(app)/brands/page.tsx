'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Tier { label: string; targetMargin: number }
interface Brand { id: number; nama: string; feeDefaultPersen: number; tiers: Tier[]; _count: { products: number; users: number } }
interface User { id: number; nama: string; username: string; role: string }
interface BundleItem { id?: number; productId: number; productNama: string; qty: number; hpp?: number }
interface Bundle { id: number; nama: string; hargaJualDefault: number; hpp?: number; items: BundleItem[] }
interface Product { id: number; nama: string; hargaJualDefault: number; hpp: number }
interface BrandDetail {
  id: number; nama: string; feeDefaultPersen: number; tiers: Tier[];
  users: { user: User }[]
}

export default function BrandsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<BrandDetail | null>(null)
  const [modal, setModal] = useState<'add-brand' | 'add-product' | 'assign' | 'import' | 'import-bundle' | 'add-bundle' | 'edit-bundle' | null>(null)
  const [form, setForm] = useState({ nama: '', feeDefaultPersen: '18' })
  const [productForm, setProductForm] = useState({ nama: '', hpp: '', hargaJualDefault: '' })
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])

  // Tiers editing
  const [editingTiers, setEditingTiers] = useState(false)
  const [tempTiers, setTempTiers] = useState<Tier[]>([])
  const [savingTiers, setSavingTiers] = useState(false)

  // Fee editing
  const [editingFee, setEditingFee] = useState(false)
  const [tempFee, setTempFee] = useState('')
  const [savingFee, setSavingFee] = useState(false)

  // Import Products
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Import Bundles
  const [importBundleFile, setImportBundleFile] = useState<File | null>(null)
  const [importBundleResult, setImportBundleResult] = useState<{ imported: number; errors?: string[] } | null>(null)
  const bundleFileInputRef = useRef<HTMLInputElement>(null)

  // Product pagination
  const [productPage, setProductPage] = useState(1)
  const productsPerPage = 10

  // Bundle form
  const [bundleForm, setBundleForm] = useState({ nama: '', hargaJualDefault: '' })
  const [bundleItems, setBundleItems] = useState<{ productId: number; qty: number }[]>([{ productId: 0, qty: 1 }])
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)

  useEffect(() => {
    loadBrands()
    fetch('/api/users').then(r => r.json()).then(data => { if (!data.error) setAllUsers(data) })
  }, [])

  async function loadBrands() {
    const res = await fetch('/api/brands')
    if (res.status === 403) { router.push('/calculator'); return }
    setBrands(await res.json())
  }

  async function openBrand(b: Brand) {
    const [detailRes, prodRes, bundleRes] = await Promise.all([
      fetch(`/api/brands/${b.id}`),
      fetch(`/api/brands/${b.id}/products`),
      fetch(`/api/brands/${b.id}/bundles`),
    ])
    const [detail, prods, bunds] = await Promise.all([detailRes.json(), prodRes.json(), bundleRes.json()])
    setSelected(detail)
    setProducts(prods)
    setBundles(Array.isArray(bunds) ? bunds : [])
    setProductPage(1)
    setEditingTiers(false)
    setEditingFee(false)
  }

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/brands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: form.nama, feeDefaultPersen: parseFloat(form.feeDefaultPersen) }),
    })
    setModal(null); setForm({ nama: '', feeDefaultPersen: '18' }); loadBrands(); setLoading(false)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    await fetch(`/api/brands/${selected.id}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: productForm.nama, hpp: parseInt(productForm.hpp), hargaJualDefault: parseInt(productForm.hargaJualDefault) }),
    })
    setModal(null); setProductForm({ nama: '', hpp: '', hargaJualDefault: '' })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    setLoading(false)
  }

  async function handleDeleteProduct(productId: number) {
    if (!selected || !confirm('Hapus produk ini?')) return
    await fetch(`/api/brands/${selected.id}/products/${productId}`, { method: 'DELETE' })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !importFile) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', importFile)
    const res = await fetch(`/api/brands/${selected.id}/products/import`, { method: 'POST', body: fd })
    const result = await res.json()
    setImportResult(result)
    if (res.ok) openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    setLoading(false)
  }

  async function handleImportBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !importBundleFile) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', importBundleFile)
    const res = await fetch(`/api/brands/${selected.id}/bundles/import`, { method: 'POST', body: fd })
    const result = await res.json()
    setImportBundleResult(result)
    if (res.ok) openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    setLoading(false)
  }

  async function handleAddBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const validItems = bundleItems.filter(i => i.productId > 0 && i.qty > 0)
    if (!validItems.length) return
    setLoading(true)
    const res = await fetch(`/api/brands/${selected.id}/bundles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: bundleForm.nama, hargaJualDefault: parseInt(bundleForm.hargaJualDefault), items: validItems }),
    })
    if (res.ok) {
      setModal(null)
      setBundleForm({ nama: '', hargaJualDefault: '' })
      setBundleItems([{ productId: 0, qty: 1 }])
      openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    }
    setLoading(false)
  }

  async function handleEditBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !editingBundle) return
    const validItems = bundleItems.filter(i => i.productId > 0 && i.qty > 0)
    setLoading(true)
    await fetch(`/api/brands/${selected.id}/bundles/${editingBundle.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: bundleForm.nama, hargaJualDefault: parseInt(bundleForm.hargaJualDefault), items: validItems }),
    })
    setModal(null); setEditingBundle(null)
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    setLoading(false)
  }

  async function handleDeleteBundle(bundleId: number) {
    if (!selected || !confirm('Hapus bundle ini?')) return
    await fetch(`/api/brands/${selected.id}/bundles/${bundleId}`, { method: 'DELETE' })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
  }

  function openEditBundle(b: Bundle) {
    setEditingBundle(b)
    setBundleForm({ nama: b.nama, hargaJualDefault: b.hargaJualDefault.toString() })
    setBundleItems(b.items.map(i => ({ productId: i.productId, qty: i.qty })))
    setModal('edit-bundle')
  }

  async function toggleAssign(userId: number, isAssigned: boolean) {
    if (!selected) return
    await fetch(`/api/brands/${selected.id}/assign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: isAssigned ? 'unassign' : 'assign' }),
    })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
  }

  function startEditTiers() {
    if (!selected) return
    setTempTiers(selected.tiers?.length ? [...selected.tiers] : [])
    setEditingTiers(true)
  }

  async function saveTiers() {
    if (!selected) return
    setSavingTiers(true)
    const res = await fetch(`/api/brands/${selected.id}/tiers`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers: tempTiers }),
    })
    if (res.ok) {
      setSelected(s => s ? { ...s, tiers: tempTiers } : s)
      setBrands(prev => prev.map(b => b.id === selected.id ? { ...b, tiers: tempTiers } : b))
      setEditingTiers(false)
    }
    setSavingTiers(false)
  }

  async function saveFee() {
    if (!selected) return
    const fee = parseFloat(tempFee)
    if (isNaN(fee) || fee < 0) return
    setSavingFee(true)
    const res = await fetch(`/api/brands/${selected.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeDefaultPersen: fee }),
    })
    if (res.ok) {
      setSelected(s => s ? { ...s, feeDefaultPersen: fee } : s)
      setBrands(prev => prev.map(b => b.id === selected.id ? { ...b, feeDefaultPersen: fee } : b))
      setEditingFee(false)
    }
    setSavingFee(false)
  }

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">🏷️ Manajemen Brand</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola brand, produk, bundling, dan akses tim</p>
        </div>
        <button onClick={() => setModal('add-brand')} className="btn-primary">+ Tambah Brand</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Brand List */}
        <div className="space-y-2">
          {brands.map(b => (
            <button key={b.id} onClick={() => openBrand(b)}
              className={`w-full text-left card p-4 transition-all hover:border-[#e85d26]/50 ${selected?.id === b.id ? 'border-[#e85d26]' : ''}`}>
              <p className="font-semibold text-slate-100">{b.nama}</p>
              <p className="text-xs text-slate-500 mt-1">{b._count?.products ?? 0} produk · Fee {b.feeDefaultPersen}%</p>
            </button>
          ))}
        </div>

        {/* Brand Detail */}
        {selected ? (
          <div className="md:col-span-2 space-y-4">
            <div className="card space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{selected.nama}</h2>
                  {/* Inline fee edit */}
                  <div className="flex items-center gap-2 mt-1">
                    {editingFee ? (
                      <>
                        <span className="text-xs text-slate-400">Fee:</span>
                        <input type="number" step="0.1" min="0" max="100"
                          className="input w-16 text-center text-xs py-0.5"
                          value={tempFee} onChange={e => setTempFee(e.target.value)} />
                        <span className="text-xs text-slate-400">%</span>
                        <button onClick={saveFee} disabled={savingFee} className="text-xs text-green-400 hover:text-green-300">
                          {savingFee ? '...' : 'Simpan'}
                        </button>
                        <button onClick={() => setEditingFee(false)} className="text-xs text-slate-500 hover:text-slate-400">Batal</button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-400">Biaya Admin: {selected.feeDefaultPersen}%</span>
                        <button onClick={() => { setTempFee(selected.feeDefaultPersen.toString()); setEditingFee(true) }}
                          className="text-xs text-slate-500 hover:text-[#e85d26]">✏️</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal('assign')} className="btn-secondary text-xs py-1.5">👥 Assign</button>
                  <button onClick={() => setModal('add-product')} className="btn-primary text-xs py-1.5">+ Produk</button>
                </div>
              </div>

              {/* Target Margin Tiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Margin Tiers</h3>
                  {!editingTiers && (
                    <button onClick={startEditTiers} className="btn-secondary text-xs py-1 px-3">✏️ Edit</button>
                  )}
                </div>
                {editingTiers ? (
                  <div className="space-y-2">
                    {tempTiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" className="input max-w-[150px]" value={tier.label}
                          onChange={e => setTempTiers(t => t.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
                        <input type="number" className="input w-16 text-center" value={tier.targetMargin} min={0} max={90} step={0.5}
                          onChange={e => setTempTiers(t => t.map((x, idx) => idx === i ? { ...x, targetMargin: parseFloat(e.target.value) || 0 } : x))} />
                        <span className="text-slate-400 text-sm">%</span>
                        {i > 0 && <button onClick={() => setTempTiers(t => t.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">✕</button>}
                      </div>
                    ))}
                    <button onClick={() => setTempTiers(t => [...t, { label: 'Target Baru', targetMargin: 0 }])} className="text-slate-400 text-xs">+ Tambah</button>
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveTiers} disabled={savingTiers} className="btn-primary text-xs py-1.5 px-4">{savingTiers ? 'Menyimpan...' : 'Simpan'}</button>
                      <button onClick={() => setEditingTiers(false)} className="btn-secondary text-xs py-1.5 px-4">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(selected.tiers ?? []).map((tier, i) => (
                      <div key={i} className="bg-[#060d1f] border border-[#162d58] rounded-lg px-3 py-2 text-center min-w-[80px]">
                        <p className="text-xs text-slate-500 mb-0.5">{tier.label}</p>
                        <p className="text-sm font-bold text-slate-200">{tier.targetMargin === 0 ? 'BEP' : `${tier.targetMargin}%`}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Produk ({products.length})</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setImportFile(null); setImportResult(null); setModal('import') }} className="btn-secondary text-xs py-1 px-3">📥 Import CSV/XLS</button>
                    <button onClick={() => setModal('add-product')} className="btn-secondary text-xs py-1 px-3">+ Produk</button>
                  </div>
                </div>
                {products.length === 0 ? (
                  <p className="text-slate-600 text-sm">Belum ada produk. Tambah manual atau import CSV/XLS.</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {products.slice((productPage - 1) * productsPerPage, productPage * productsPerPage).map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-[#060d1f] rounded-lg px-4 py-2.5">
                          <div>
                            <p className="font-medium text-slate-200 text-sm">{p.nama}</p>
                            <p className="text-xs text-slate-500">HPP: {fmt(p.hpp)} · Default: {fmt(p.hargaJualDefault)}</p>
                          </div>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-400 text-xs ml-4">Hapus</button>
                        </div>
                      ))}
                    </div>
                    {products.length > productsPerPage && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#162d58]">
                        <p className="text-xs text-slate-500">
                          Menampilkan {(productPage - 1) * productsPerPage + 1}–{Math.min(productPage * productsPerPage, products.length)} dari {products.length}
                        </p>
                        <div className="flex gap-1">
                          <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}
                            className="px-2 py-1 text-xs rounded bg-[#162d58] text-slate-300 disabled:opacity-40 hover:bg-[#1e3a6e]">←</button>
                          {Array.from({ length: Math.ceil(products.length / productsPerPage) }, (_, i) => i + 1).map(page => (
                            <button key={page} onClick={() => setProductPage(page)}
                              className={`px-2 py-1 text-xs rounded ${page === productPage ? 'bg-[#e85d26] text-white' : 'bg-[#162d58] text-slate-300 hover:bg-[#1e3a6e]'}`}>
                              {page}
                            </button>
                          ))}
                          <button onClick={() => setProductPage(p => Math.min(Math.ceil(products.length / productsPerPage), p + 1))}
                            disabled={productPage === Math.ceil(products.length / productsPerPage)}
                            className="px-2 py-1 text-xs rounded bg-[#162d58] text-slate-300 disabled:opacity-40 hover:bg-[#1e3a6e]">→</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bundles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bundling ({bundles.length})</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setImportBundleFile(null); setImportBundleResult(null); setModal('import-bundle') }} className="btn-secondary text-xs py-1 px-3">📥 Import CSV/XLS</button>
                    <button onClick={() => { setBundleForm({ nama: '', hargaJualDefault: '' }); setBundleItems([{ productId: 0, qty: 1 }]); setModal('add-bundle') }}
                      className="btn-secondary text-xs py-1 px-3">+ Buat Bundle</button>
                  </div>
                </div>
                {bundles.length === 0 ? (
                  <p className="text-slate-600 text-sm">Belum ada bundle. Bundle = gabungan beberapa produk.</p>
                ) : (
                  <div className="space-y-2">
                    {bundles.map(b => (
                      <div key={b.id} className="bg-[#060d1f] border border-[#162d58] rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-200 text-sm">{b.nama}</p>
                          <div className="flex gap-2">
                            <button onClick={() => openEditBundle(b)} className="text-slate-400 hover:text-slate-300 text-xs">Edit</button>
                            <button onClick={() => handleDeleteBundle(b.id)} className="text-red-500 hover:text-red-400 text-xs">Hapus</button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">Harga: {fmt(b.hargaJualDefault)} · HPP: {fmt(b.hpp ?? 0)}</p>
                        <div className="flex flex-wrap gap-1">
                          {b.items.map((item, i) => (
                            <span key={i} className="bg-[#162d58] text-slate-300 text-xs px-2 py-0.5 rounded-full">
                              {item.productNama} ×{item.qty}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tim yang Dapat Akses</h3>
                {selected.users.length === 0 ? (
                  <p className="text-slate-600 text-sm">Belum ada staff yang di-assign.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.users.map(u => (
                      <span key={u.user.id} className="bg-[#162d58] text-slate-300 text-xs px-3 py-1 rounded-full">{u.user.nama}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-slate-600 text-sm">← Pilih brand untuk melihat detail</div>
        )}
      </div>

      {/* === MODALS === */}
      {modal === 'add-brand' && (
        <Modal title="Tambah Brand" onClose={() => setModal(null)}>
          <form onSubmit={handleAddBrand} className="space-y-4">
            <div><label className="label">Nama Brand</label><input className="input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required /></div>
            <div><label className="label">Fee Default (%)</label><input type="number" step="0.1" className="input" value={form.feeDefaultPersen} onChange={e => setForm(f => ({ ...f, feeDefaultPersen: e.target.value }))} required /></div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </form>
        </Modal>
      )}

      {modal === 'add-product' && selected && (
        <Modal title={`Tambah Produk — ${selected.nama}`} onClose={() => setModal(null)}>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div><label className="label">Nama Produk</label><input className="input" value={productForm.nama} onChange={e => setProductForm(f => ({ ...f, nama: e.target.value }))} required /></div>
            <div><label className="label">HPP (Rp)</label><input type="number" className="input" value={productForm.hpp} onChange={e => setProductForm(f => ({ ...f, hpp: e.target.value }))} required /></div>
            <div><label className="label">Harga Jual Default (Rp)</label><input type="number" className="input" value={productForm.hargaJualDefault} onChange={e => setProductForm(f => ({ ...f, hargaJualDefault: e.target.value }))} required /></div>
            <p className="text-xs text-slate-500">* HPP hanya terlihat oleh OWNER.</p>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </form>
        </Modal>
      )}

      {modal === 'import' && selected && (
        <Modal title={`Import Produk — ${selected.nama}`} onClose={() => { setModal(null); setImportResult(null) }}>
          <div className="space-y-4">
            <div className="bg-[#060d1f] border border-[#162d58] rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Format file (CSV / XLS / XLSX):</p>
              <p>Kolom yang dibutuhkan:</p>
              <code className="block bg-[#0a1628] p-2 rounded text-slate-300">nama, hpp, hargajual</code>
              <p className="text-slate-500">Contoh: Gamis Polos, 35000, 89000</p>
            </div>
            {!importResult ? (
              <form onSubmit={handleImport} className="space-y-3">
                <div>
                  <label className="label">Pilih File</label>
                  <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx"
                    className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#162d58] file:text-slate-300 file:text-xs"
                    onChange={e => setImportFile(e.target.files?.[0] ?? null)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading || !importFile}>
                  {loading ? 'Mengimport...' : '📥 Import Sekarang'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-900/20 border border-green-800/40 text-green-400 text-sm px-4 py-3 rounded-lg">
                  ✅ Berhasil import <strong>{importResult.imported}</strong> produk
                  {importResult.skipped > 0 && `, ${importResult.skipped} baris dilewati`}
                </div>
                {importResult.errors?.length && (
                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 text-xs text-yellow-400 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                <button onClick={() => { setModal(null); setImportResult(null) }} className="btn-primary w-full">Selesai</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === 'import-bundle' && selected && (
        <Modal title={`Import Bundle — ${selected.nama}`} onClose={() => { setModal(null); setImportBundleResult(null) }}>
          <div className="space-y-4">
            <div className="bg-[#060d1f] border border-[#162d58] rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Format file (CSV / XLS / XLSX):</p>
              <p>Kolom minimal:</p>
              <code className="block bg-[#0a1628] p-2 rounded text-slate-300">nama, harga_jual</code>
              <p className="text-slate-500 mt-1">Opsional (jika ingin auto-link produk):</p>
              <code className="block bg-[#0a1628] p-2 rounded text-slate-300">produk1, qty1, produk2, qty2, ...</code>
              <p className="text-slate-500">atau: produk (dipisah koma), qty (dipisah koma)</p>
              <p className="text-slate-500 mt-1">Contoh sederhana (tanpa produk):</p>
              <code className="block bg-[#0a1628] p-2 rounded text-slate-300">Set Active Top x Fiora Pants, 250000</code>
            </div>
            {!importBundleResult ? (
              <form onSubmit={handleImportBundle} className="space-y-3">
                <div>
                  <label className="label">Pilih File</label>
                  <input ref={bundleFileInputRef} type="file" accept=".csv,.xls,.xlsx"
                    className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#162d58] file:text-slate-300 file:text-xs"
                    onChange={e => setImportBundleFile(e.target.files?.[0] ?? null)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading || !importBundleFile}>
                  {loading ? 'Mengimport...' : '📥 Import Bundle Sekarang'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-900/20 border border-green-800/40 text-green-400 text-sm px-4 py-3 rounded-lg">
                  ✅ Berhasil import <strong>{importBundleResult.imported}</strong> bundle
                </div>
                {importBundleResult.errors && importBundleResult.errors.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 text-xs text-yellow-400 space-y-1 max-h-32 overflow-y-auto">
                    {importBundleResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                <button onClick={() => { setModal(null); setImportBundleResult(null) }} className="btn-primary w-full">Selesai</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {(modal === 'add-bundle' || modal === 'edit-bundle') && selected && (
        <Modal title={modal === 'add-bundle' ? `Buat Bundle — ${selected.nama}` : `Edit Bundle — ${editingBundle?.nama}`}
          onClose={() => { setModal(null); setEditingBundle(null) }}>
          <form onSubmit={modal === 'add-bundle' ? handleAddBundle : handleEditBundle} className="space-y-4">
            <div><label className="label">Nama Bundle</label>
              <input className="input" placeholder="Bundle A + B" value={bundleForm.nama}
                onChange={e => setBundleForm(f => ({ ...f, nama: e.target.value }))} required />
            </div>
            <div><label className="label">Harga Jual Bundle (Rp)</label>
              <input type="number" className="input" placeholder="150000" value={bundleForm.hargaJualDefault}
                onChange={e => setBundleForm(f => ({ ...f, hargaJualDefault: e.target.value }))} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Komponen Produk</label>
                <button type="button" onClick={() => setBundleItems(i => [...i, { productId: 0, qty: 1 }])} className="text-xs text-slate-400 hover:text-slate-300">+ Tambah</button>
              </div>
              <div className="space-y-2">
                {bundleItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select className="input flex-1" value={item.productId}
                      onChange={e => setBundleItems(items => items.map((x, idx) => idx === i ? { ...x, productId: parseInt(e.target.value) } : x))}>
                      <option value={0}>Pilih Produk</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                    </select>
                    <input type="number" className="input w-16 text-center" min={1} placeholder="Qty"
                      value={item.qty}
                      onChange={e => setBundleItems(items => items.map((x, idx) => idx === i ? { ...x, qty: parseInt(e.target.value) || 1 } : x))} />
                    {i > 0 && <button type="button" onClick={() => setBundleItems(items => items.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">✕</button>}
                  </div>
                ))}
              </div>
              {bundleItems.some(i => i.productId > 0) && (
                <p className="text-xs text-slate-500 mt-2">
                  HPP Bundle: {fmt(bundleItems.reduce((sum, item) => {
                    const p = products.find(x => x.id === item.productId)
                    return sum + (p ? p.hpp * item.qty : 0)
                  }, 0))}
                </p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Bundle'}</button>
          </form>
        </Modal>
      )}

      {modal === 'assign' && selected && (
        <Modal title={`Assign User — ${selected.nama}`} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {allUsers.filter(u => u.role !== 'OWNER').map(user => {
              const isAssigned = selected.users.some(u => u.user.id === user.id)
              return (
                <div key={user.id} className="flex items-center justify-between bg-[#060d1f] px-4 py-3 rounded-lg">
                  <div><p className="text-sm font-medium text-slate-200">{user.nama}</p><p className="text-xs text-slate-500">@{user.username}</p></div>
                  <button onClick={() => toggleAssign(user.id, isAssigned)}
                    className={isAssigned ? 'btn-danger text-xs py-1' : 'btn-secondary text-xs py-1'}>
                    {isAssigned ? 'Unassign' : 'Assign'}
                  </button>
                </div>
              )
            })}
            {allUsers.filter(u => u.role !== 'OWNER').length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">Belum ada user.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a1628] border border-[#162d58] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
