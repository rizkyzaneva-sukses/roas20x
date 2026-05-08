'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BrandInfo { id: number; nama: string }
interface UserData {
  id: number; nama: string; username: string; role: string
  brands: { brand: BrandInfo }[]
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [allBrands, setAllBrands] = useState<BrandInfo[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'brands' | null>(null)
  const [editing, setEditing] = useState<UserData | null>(null)
  const [form, setForm] = useState({ nama: '', username: '', password: '', role: 'USER' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brandMsg, setBrandMsg] = useState('')

  useEffect(() => {
    loadUsers()
    loadBrands()
  }, [])

  async function loadUsers() {
    const res = await fetch('/api/users')
    if (res.status === 403) { router.push('/calculator'); return }
    const data = await res.json()
    if (!data.error) setUsers(data)
  }

  async function loadBrands() {
    const res = await fetch('/api/brands')
    const data = await res.json()
    if (Array.isArray(data)) {
      setAllBrands(data.map((b: BrandInfo & Record<string, unknown>) => ({ id: b.id, nama: b.nama })))
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setModal(null); setForm({ nama: '', username: '', password: '', role: 'USER' }); loadUsers()
    setLoading(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setLoading(true); setError('')
    const body: Record<string, string> = { nama: form.nama, role: form.role }
    if (form.password) body.password = form.password
    await fetch(`/api/users/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setModal(null); loadUsers(); setLoading(false)
  }

  async function handleDelete(id: number, nama: string) {
    if (!confirm(`Hapus user "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    loadUsers()
  }

  function openEdit(u: UserData) {
    setEditing(u); setForm({ nama: u.nama, username: u.username, password: '', role: u.role })
    setModal('edit')
  }

  function openBrands(u: UserData) {
    setEditing(u)
    setBrandMsg('')
    setModal('brands')
  }

  async function toggleBrand(userId: number, brandId: number, isAssigned: boolean) {
    setBrandMsg('')
    try {
      const res = await fetch(`/api/brands/${brandId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: isAssigned ? 'unassign' : 'assign' }),
      })
      if (res.ok) {
        // Update local state
        setEditing(prev => {
          if (!prev) return prev
          if (isAssigned) {
            return { ...prev, brands: prev.brands.filter(b => b.brand.id !== brandId) }
          } else {
            const brand = allBrands.find(b => b.id === brandId)
            if (brand) {
              return { ...prev, brands: [...prev.brands, { brand }] }
            }
          }
          return prev
        })
        // Also update users list
        setUsers(prev => prev.map(u => {
          if (u.id !== userId) return u
          if (isAssigned) {
            return { ...u, brands: u.brands.filter(b => b.brand.id !== brandId) }
          } else {
            const brand = allBrands.find(b => b.id === brandId)
            if (brand) {
              return { ...u, brands: [...u.brands, { brand }] }
            }
          }
          return u
        }))
        setBrandMsg(isAssigned ? '✅ Brand berhasil di-unassign' : '✅ Brand berhasil di-assign')
      } else {
        setBrandMsg('❌ Gagal mengubah akses brand')
      }
    } catch {
      setBrandMsg('❌ Terjadi kesalahan')
    }
    setTimeout(() => setBrandMsg(''), 3000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">👥 Manajemen User</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akun dan akses brand tim kamu</p>
        </div>
        <button onClick={() => { setModal('add'); setForm({ nama: '', username: '', password: '', role: 'USER' }) }} className="btn-primary">+ Tambah User</button>
      </div>

      <div className="card divide-y divide-[#162d58]">
        {users.length === 0 && <p className="text-slate-600 text-sm text-center py-8">Belum ada user selain kamu.</p>}
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#162d58] rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                {u.nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-200 text-sm">{u.nama}</p>
                  <span className={u.role === 'OWNER' ? 'badge-owner' : u.role === 'MANAGER' ? 'badge-manager' : 'badge-user'}>{u.role}</span>
                </div>
                <p className="text-xs text-slate-500">@{u.username}</p>
                {u.brands.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {u.brands.map(b => (
                      <span key={b.brand.id} className="bg-[#162d58]/60 text-slate-400 text-xs px-2 py-0.5 rounded">{b.brand.nama}</span>
                    ))}
                  </div>
                )}
                {u.role !== 'OWNER' && u.brands.length === 0 && (
                  <p className="text-xs text-yellow-500/70 mt-1">⚠️ Belum ada brand</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {u.role !== 'OWNER' && (
                <button onClick={() => openBrands(u)} className="btn-secondary text-xs py-1.5">🏷️ Brand</button>
              )}
              <button onClick={() => openEdit(u)} className="btn-secondary text-xs py-1.5">Edit</button>
              <button onClick={() => handleDelete(u.id, u.nama)} className="btn-danger text-xs py-1.5">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit User Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-[#162d58] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100">{modal === 'add' ? 'Tambah User' : `Edit — ${editing?.nama}`}</h3>
              <button onClick={() => { setModal(null); setError('') }} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
            </div>
            <form onSubmit={modal === 'add' ? handleAdd : handleEdit} className="space-y-4">
              <div><label className="label">Nama</label><input className="input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required placeholder="Nama Lengkap" /></div>
              {modal === 'add' && <div><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="username_staff" /></div>}
              <div><label className="label">{modal === 'edit' ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={modal === 'add'} placeholder="••••••••" /></div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="USER">USER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>
              {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Brand Assignment Modal */}
      {modal === 'brands' && editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-[#162d58] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-100">🏷️ Akses Brand — {editing.nama}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pilih brand yang bisa diakses user ini</p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-300 text-xl">✕</button>
            </div>

            {brandMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${brandMsg.startsWith('✅') ? 'bg-green-900/30 border border-green-800/50 text-green-400' : 'bg-red-900/30 border border-red-800/50 text-red-400'}`}>
                {brandMsg}
              </div>
            )}

            <div className="space-y-2">
              {allBrands.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-4">Belum ada brand. Buat brand terlebih dahulu.</p>
              )}
              {allBrands.map(brand => {
                const isAssigned = editing.brands.some(b => b.brand.id === brand.id)
                return (
                  <div key={brand.id} className="flex items-center justify-between bg-[#060d1f] px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isAssigned ? 'bg-green-400' : 'bg-slate-600'}`} />
                      <p className="text-sm font-medium text-slate-200">{brand.nama}</p>
                    </div>
                    <button
                      onClick={() => toggleBrand(editing.id, brand.id, isAssigned)}
                      className={isAssigned
                        ? 'text-xs px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 transition-colors'
                        : 'text-xs px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 transition-colors'
                      }
                    >
                      {isAssigned ? '✕ Hapus Akses' : '+ Tambah Akses'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#162d58]">
              <p className="text-xs text-slate-500">
                {editing.brands.length} brand di-assign ke {editing.nama}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
