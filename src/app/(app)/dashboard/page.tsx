import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  const isOwner = session.role === 'OWNER'

  const brandIds = isOwner
    ? (await prisma.brand.findMany({ where: { isActive: true }, select: { id: true } })).map(b => b.id)
    : session.brandIds

  const brands = await prisma.brand.findMany({
    where: { id: { in: brandIds }, isActive: true },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
    orderBy: { nama: 'asc' },
  })

  const totalUsers = isOwner ? await prisma.user.count({ where: { isActive: true } }) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">🏠 Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Selamat datang, {session.nama}</p>
      </div>

      {/* Quick Action */}
      <div className="card bg-gradient-to-r from-[#e85d26]/10 to-[#0a1628] border-[#e85d26]/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Mulai Kalkulasi ROAS</h2>
            <p className="text-slate-400 text-sm mt-1">Hitung minimum ROAS untuk produk kamu</p>
          </div>
          <Link href="/calculator" className="btn-primary">Buka Kalkulator →</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#e85d26]">{brands.length}</p>
          <p className="text-slate-400 text-sm mt-1">Brand Aktif</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#e85d26]">
            {brands.reduce((sum, b) => sum + b._count.products, 0)}
          </p>
          <p className="text-slate-400 text-sm mt-1">Total Produk</p>
        </div>
        {totalUsers != null && (
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#e85d26]">{totalUsers}</p>
            <p className="text-slate-400 text-sm mt-1">User Aktif</p>
          </div>
        )}
      </div>

      {/* Brand List */}
      <div className="card space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Brand Kamu</h2>
        <div className="divide-y divide-[#162d58]">
          {brands.map(brand => (
            <div key={brand.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-200">{brand.nama}</p>
                <p className="text-xs text-slate-500">Fee default: {brand.feeDefaultPersen}%</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{brand._count.products} produk</span>
                <Link href={`/calculator`} className="btn-secondary text-xs py-1 px-3">Hitung ROAS</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
