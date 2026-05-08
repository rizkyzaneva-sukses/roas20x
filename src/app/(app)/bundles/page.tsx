'use client'

import { useState, useEffect, useCallback } from 'react'

interface Brand { id: number; nama: string }
interface Product { id: number; nama: string; hargaJualDefault: number }
interface BundleItem { id?: number; productId: number; productNama: string; qty: number }
interface Bundle { id: number; nama: string; hargaJualDefault: number; items: BundleItem[] }

function fmt(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0a1628] border border-[#162d58] rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function BundlesPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<number>(0)
  const [products, setProducts] = useState<Product[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  // Bundle form
  const [bundleForm, setBundleForm] = useState({ nama: '', hargaJualDefault: '' })
  const [bundleItems, setBundleItems] = useState<{ productId: number; qty: number }[]>([{ productId: 0, qty: 1 }])
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Load brands on mount
  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setBrands(data)
    })
  }, [])

  // Load products and bundles when brand changes
  const loadBrandData = useCallback(async (brandId: number) => {
    if (!brandId) return
    setLoading(true)
    try {
      const [prodRes, bundleRes] = await Promise.all([
        fetch(`/api/brands/${brandId}/products`),
        fetch(`/api/brands/${brandId}/bundles`),
      ])
      const [prodData, bundleData] = await Promise.all([prodRes.json(), bundleRes.json()])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setBundles(Array.isArray(bundleData) ? bundleData : [])
    } catch {
      setProducts([])
      setBundles([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedBrandId) loadBrandData(selectedBrandId)
  }, [selectedBrandId, loadBrandData])

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // Add bundle item row
  function addBundleItem() {
    setBundleItems(items => [...items, { productId: 0, qty: 1 }])
  }

  // Remove bundle item row
  function removeBundleItem(idx: number) {
    setBundleItems(items => items.filter((_, i) => i !== idx))
  }

  // Update bundle item
  function updateBundleItem(idx: number, field: 'productId' | 'qty', value: number) {
    setBundleItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  // Calculate total harga from selected products
  function calcTotalHarga(): number {
    return bundleItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId)
      return sum + (prod ? prod.hargaJualDefault * item.qty : 0)
    }, 0)
  }

  // Open add modal
  function openAddModal() {
    setBundleForm({ nama: '', hargaJualDefault: '' })
    setBundleItems([{ productId: 0, qty: 1 }])
    setEditingBundle(null)
    setModal('add')
  }

  // Open edit modal
  function openEditModal(bundle: Bundle) {
    setEditingBundle(bundle)
    setBundleForm({ nama: bundle.nama, hargaJualDefault: bundle.hargaJualDefault.toString() })
    setBundleItems(bundle.items.map(i => ({ productId: i.productId, qty: i.qty })))
    setModal('edit')
  }

  // Submit add bundle
  async function handleAddBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBrandId) return

    const validItems = bundleItems.filter(i => i.productId > 0 && i.qty > 0)
    if (!validItems.length) {
      showMsg('Pilih minimal 1 produk untuk bundle', 'error')
      return
    }
    if (!bundleForm.nama.trim()) {
      showMsg('Nama bundle wajib diisi', 'error')
      return
    }
    if (!bundleForm.hargaJualDefault || parseInt(bundleForm.hargaJualDefault) <= 0) {
      showMsg('Harga jual bundle wajib diisi', 'error')
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/brands/${selectedBrandId}/bundles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: bundleForm.nama,
          hargaJualDefault: parseInt(bundleForm.hargaJualDefault),
          items: validItems,
        }),
      })
      if (res.ok) {
        showMsg('✅ Bundle berhasil dibuat!')
        setModal(null)
        loadBrandData(selectedBrandId)
      } else {
        const data = await res.json()
        showMsg(`❌ ${data.error || 'Gagal membuat bundle'}`, 'error')
      }
    } catch {
      showMsg('❌ Terjadi kesalahan', 'error')
    }
    setFormLoading(false)
  }

  // Submit edit bundle
  async function handleEditBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBrandId || !editingBundle) return

    const validItems = bundleItems.filter(i => i.productId > 0 && i.qty > 0)
    if (!validItems.length) {
      showMsg('Pilih minimal 1 produk untuk bundle', 'error')
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/brands/${selectedBrandId}/bundles/${editingBundle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: bundleForm.nama,
          hargaJualDefault: parseInt(bundleForm.hargaJualDefault),
          items: validItems,
        }),
      })
      if (res.ok) {
        showMsg('✅ Bundle berhasil diperbarui!')
        setModal(null)
        setEditingBundle(null)
        loadBrandData(selectedBrandId)
      } else {
        const data = await res.json()
        showMsg(`❌ ${data.error || 'Gagal memperbarui bundle'}`, 'error')
      }
    } catch {
      showMsg('❌ Terjadi kesalahan', 'error')
    }
    setFormLoading(false)
  }

  // Delete bundle
  async function handleDeleteBundle(bundleId: number) {
    if (!confirm('Hapus bundle ini?')) return
    try {
      const res = await fetch(`/api/brands/${selectedBrandId}/bundles/${bundleId}`, { method: 'DELETE' })
      if (res.ok) {
        showMsg('✅ Bundle berhasil dihapus')
        loadBrandData(selectedBrandId)
      } else {
        showMsg('❌ Gagal menghapus bundle', 'error')
      }
    } catch {
      showMsg('❌ Terjadi kesalahan', 'error')
    }
  }

  // Bundle form JSX helper (not a component — avoids remount/focus loss)
  function renderBundleForm(onSubmit: (e: React.FormEvent) => void, submitLabel: string) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Nama Bundle</label>
          <input
            className="input"
            placeholder="contoh: Paket Hemat A"
            value={bundleForm.nama}
            onChange={e => setBundleForm(f => ({ ...f, nama: e.target.value }))}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Produk dalam Bundle</label>
            <button type="button" onClick={addBundleItem} className="text-xs text-[#e85d26] hover:text-[#ff7a45]">
              + Tambah Produk
            </button>
          </div>
          <div className="space-y-2">
            {bundleItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={item.productId || ''}
                  onChange={e => updateBundleItem(idx, 'productId', parseInt(e.target.value) || 0)}
                >
                  <option value="">Pilih Produk</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {fmt(p.hargaJualDefault)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">×</span>
                  <input
                    type="number"
                    min="1"
                    className="input w-16 text-center"
                    value={item.qty}
                    onChange={e => updateBundleItem(idx, 'qty', parseInt(e.target.value) || 1)}
                  />
                </div>
                {bundleItems.length > 1 && (
                  <button type="button" onClick={() => removeBundleItem(idx)} className="text-red-500 hover:text-red-400 text-sm">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {bundleItems.some(i => i.productId > 0) && (
            <p className="text-xs text-slate-500 mt-2">
              Total harga produk: <span className="text-slate-300 font-medium">{fmt(calcTotalHarga())}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label">Harga Jual Bundle (Rp)</label>
          <input
            type="number"
            className="input"
            placeholder="contoh: 150000"
            value={bundleForm.hargaJualDefault}
            onChange={e => setBundleForm(f => ({ ...f, hargaJualDefault: e.target.value }))}
            required
          />
          {bundleForm.hargaJualDefault && calcTotalHarga() > 0 && (
            <p className="text-xs mt-1">
              {parseInt(bundleForm.hargaJualDefault) < calcTotalHarga() ? (
                <span className="text-green-400">
                  Diskon {fmt(calcTotalHarga() - parseInt(bundleForm.hargaJualDefault))} ({((1 - parseInt(bundleForm.hargaJualDefault) / calcTotalHarga()) * 100).toFixed(1)}% lebih murah)
                </span>
              ) : parseInt(bundleForm.hargaJualDefault) === calcTotalHarga() ? (
                <span className="text-slate-500">Sama dengan total harga produk</span>
              ) : (
                <span className="text-yellow-400">
                  Harga bundle lebih tinggi dari total produk (+{fmt(parseInt(bundleForm.hargaJualDefault) - calcTotalHarga())})
                </span>
              )}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={formLoading}>
          {formLoading ? 'Menyimpan...' : submitLabel}
        </button>
      </form>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">📦 Kelola Bundle</h1>
        <p className="text-slate-500 text-sm mt-1">Buat dan kelola produk bundle dari produk yang sudah ada di database</p>
      </div>

      {/* Brand Selector */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Pilih Brand</label>
            <select
              className="input"
              value={selectedBrandId || ''}
              onChange={e => setSelectedBrandId(parseInt(e.target.value) || 0)}
            >
              <option value="">— Pilih Brand —</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.nama}</option>
              ))}
            </select>
          </div>
          {selectedBrandId > 0 && (
            <div className="pt-5">
              <button onClick={openAddModal} className="btn-primary text-sm" disabled={products.length === 0}>
                + Buat Bundle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          msgType === 'success'
            ? 'bg-green-900/30 border-green-800/50 text-green-400'
            : 'bg-red-900/30 border-red-800/50 text-red-400'
        }`}>
          {msg}
        </div>
      )}

      {/* Loading */}
      {loading && selectedBrandId > 0 && (
        <div className="text-center text-slate-500 py-8">Memuat data...</div>
      )}

      {/* No brand selected */}
      {!selectedBrandId && (
        <div className="card text-center py-12">
          <p className="text-slate-500">Pilih brand terlebih dahulu untuk melihat dan membuat bundle</p>
        </div>
      )}

      {/* No products warning */}
      {selectedBrandId > 0 && !loading && products.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-4 py-3 text-sm text-yellow-400">
          ⚠️ Brand ini belum memiliki produk. Hubungi admin/owner untuk menambahkan produk terlebih dahulu.
        </div>
      )}

      {/* Bundle List */}
      {selectedBrandId > 0 && !loading && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Bundle ({bundles.length})
            </h2>
            {products.length > 0 && (
              <button onClick={openAddModal} className="btn-secondary text-xs py-1 px-3">
                + Buat Bundle Baru
              </button>
            )}
          </div>

          {bundles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Belum ada bundle untuk brand ini.</p>
              {products.length > 0 && (
                <button onClick={openAddModal} className="btn-primary text-sm mt-3">
                  + Buat Bundle Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {bundles.map(b => (
                <div key={b.id} className="bg-[#060d1f] border border-[#162d58] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-200">📦 {b.nama}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Harga Jual: <span className="text-slate-300 font-medium">{fmt(b.hargaJualDefault)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(b)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-400 hover:bg-blue-900/50 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBundle(b.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 transition-colors"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>

                  {/* Bundle items */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.items.map((item, i) => (
                      <span key={i} className="bg-[#162d58] text-slate-300 text-xs px-2.5 py-1 rounded-full">
                        {item.productNama} ×{item.qty}
                      </span>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-2 pt-2 border-t border-[#162d58]/60">
                    <p className="text-xs text-slate-500">
                      {b.items.length} produk · {b.items.reduce((sum, i) => sum + i.qty, 0)} total item
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Bundle Modal */}
      {modal === 'add' && (
        <Modal title="Buat Bundle Baru" onClose={() => setModal(null)}>
          {renderBundleForm(handleAddBundle, '📦 Buat Bundle')}
        </Modal>
      )}

      {/* Edit Bundle Modal */}
      {modal === 'edit' && editingBundle && (
        <Modal title={`Edit Bundle — ${editingBundle.nama}`} onClose={() => { setModal(null); setEditingBundle(null) }}>
          {renderBundleForm(handleEditBundle, '💾 Simpan Perubahan')}
        </Modal>
      )}
    </div>
  )
}
