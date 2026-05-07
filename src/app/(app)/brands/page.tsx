'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Brand { id: number; nama: string; feeDefaultPersen: number; _count: { products: number; users: number } }
interface User { id: number; nama: string; username: string; role: string }
interface BrandDetail { id: number; nama: string; feeDefaultPersen: number; users: { user: User }[] }

export default function BrandsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<BrandDetail | null>(null)
  const [modal, setModal] = useState<'add-brand' | 'add-product' | 'assign' | null>(null)
  const [form, setForm] = useState({ nama: '', feeDefaultPersen: '18' })
  const [productForm, setProductForm] = useState({ nama: '', hpp: '', hargaJualDefault: '' })
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<{ id: number; nama: string; hargaJualDefault: number; hpp: number }[]>([])

  useEffect(() => {
    loadBrands()
    fetch('/api/users').then(r => r.json()).then(data => { if (!data.error) setAllUsers(data) })
  }, [])

  async function loadBrands() {
    const res = await fetch('/api/brands')
    if (res.status === 403) { router.push('/calculator'); return }
    const data = await res.json()
    setBrands(data)
  }

  async function openBrand(b: Brand) {
    const [detailRes, prodRes] = await Promise.all([
      fetch(`/api/brands/${b.id}`),
      fetch(`/api/brands/${b.id}/products`)
    ])
    const [detail, prods] = await Promise.all([detailRes.json(), prodRes.json()])
    setSelected(detail)
    setProducts(prods)
  }

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: form.nama, feeDefaultPersen: parseFloat(form.feeDefaultPersen) }),
    })
    setModal(null)
    setForm({ nama: '', feeDefaultPersen: '18' })
    loadBrands()
    setLoading(false)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    await fetch(`/api/brands/${selected.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: productForm.nama,
        hpp: parseInt(productForm.hpp),
        hargaJualDefault: parseInt(productForm.hargaJualDefault),
      }),
    })
    setModal(null)
    setProductForm({ nama: '', hpp: '', hargaJualDefault: '' })
    if (selected) openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
    setLoading(false)
  }

  async function handleDeleteProduct(productId: number) {
    if (!selected) return
    if (!confirm('Hapus produk ini?')) return
    await fetch(`/api/brands/${selected.id}/products/${productId}`, { method: 'DELETE' })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
  }

  async function toggleAssign(userId: number, isAssigned: boolean) {
    if (!selected) return
    await fetch(`/api/brands/${selected.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: isAssigned ? 'unassign' : 'assign' }),
    })
    openBrand({ ...selected, _count: { products: 0, users: 0 } } as Brand)
  }

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">🏷️ Manajemen Brand</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola brand, produk, dan akses tim</p>
        </div>
        <button onClick={() => setModal('add-brand')} className="btn-primary">+ Tambah Brand</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Brand List */}
        <div className="space-y-2">
          {brands.map(b => (
            <button
              key={b.id}
              onClick={() => openBrand(b)}
              className={`w-full text-left card p-4 transition-all hover:border-[#e85d26]/50 ${selected?.id === b.id ? 'border-[#e85d26]' : ''}`}
            >
              <p className="font-semibold text-slate-100">{b.nama}</p>
              <p className="text-xs text-slate-500 mt-1">{b._count?.products ?? 0} produk · Fee {b.feeDefaultPersen}%</p>
            </button>
          ))}
        </div>

        {/* Brand Detail */}
        {selected ? (
          <div className="md:col-span-2 space-y-4">
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">{selected.nama}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setModal('assign')} className="btn-secondary text-xs py-1.5">👥 Assign User</button>
                  <button onClick={() => setModal('add-product')} className="btn-primary text-xs py-1.5">+ Produk</button>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Produk</h3>
                {products.length === 0 ? (
                  <p className="text-slate-600 text-sm">Belum ada produk. Tambah produk pertama!</p>
                ) : (
                  <div className="space-y-2">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-[#060d1f] rounded-lg px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-200 text-sm">{p.nama}</p>
                          <p className="text-xs text-slate-500">
                            HPP: {fmt(p.hpp)} · Harga Default: {fmt(p.hargaJualDefault)}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-400 text-xs ml-4">Hapus</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Users */}
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
          <div className="md:col-span-2 flex items-center justify-center text-slate-600 text-sm">
            ← Pilih brand untuk melihat detail
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'add-brand' && (
        <Modal title="Tambah Brand" onClose={() => setModal(null)}>
          <form onSubmit={handleAddBrand} className="space-y-4">
            <div><label className="label">Nama Brand</label><input className="input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required placeholder="Zaneva" /></div>
            <div><label className="label">Fee Default (%)</label><input type="number" step="0.1" className="input" value={form.feeDefaultPersen} onChange={e => setForm(f => ({ ...f, feeDefaultPersen: e.target.value }))} required /></div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </form>
        </Modal>
      )}

      {modal === 'add-product' && selected && (
        <Modal title={`Tambah Produk — ${selected.nama}`} onClose={() => setModal(null)}>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div><label className="label">Nama Produk</label><input className="input" value={productForm.nama} onChange={e => setProductForm(f => ({ ...f, nama: e.target.value }))} required placeholder="Gamis Syari Polos" /></div>
            <div><label className="label">HPP (Rp)</label><input type="number" className="input" value={productForm.hpp} onChange={e => setProductForm(f => ({ ...f, hpp: e.target.value }))} required placeholder="35000" /></div>
            <div><label className="label">Harga Jual Default (Rp)</label><input type="number" className="input" value={productForm.hargaJualDefault} onChange={e => setProductForm(f => ({ ...f, hargaJualDefault: e.target.value }))} required placeholder="89000" /></div>
            <p className="text-xs text-slate-500">* HPP hanya terlihat oleh OWNER, tidak akan ditampilkan ke staff.</p>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </form>
        </Modal>
      )}

      {modal === 'assign' && selected && (
        <Modal title={`Assign User — ${selected.nama}`} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {allUsers.filter(u => u.role === 'STAFF').map(user => {
              const isAssigned = selected.users.some(u => u.user.id === user.id)
              return (
                <div key={user.id} className="flex items-center justify-between bg-[#060d1f] px-4 py-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{user.nama}</p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => toggleAssign(user.id, isAssigned)}
                    className={isAssigned ? 'btn-danger text-xs py-1' : 'btn-secondary text-xs py-1'}
                  >
                    {isAssigned ? 'Unassign' : 'Assign'}
                  </button>
                </div>
              )
            })}
            {allUsers.filter(u => u.role === 'STAFF').length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">Belum ada staff. Tambah user dulu di menu User.</p>
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
      <div className="bg-[#0a1628] border border-[#162d58] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
