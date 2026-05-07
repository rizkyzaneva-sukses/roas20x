'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SidebarProps {
  session: { nama: string; role: string }
}

const navItems = [
  { href: '/calculator', label: 'Kalkulator ROAS', icon: '📊', roles: ['OWNER', 'STAFF'] },
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['OWNER', 'STAFF'] },
  { href: '/brands', label: 'Manajemen Brand', icon: '🏷️', roles: ['OWNER'] },
  { href: '/users', label: 'Manajemen User', icon: '👥', roles: ['OWNER'] },
]

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const visibleNav = navItems.filter(item => item.roles.includes(session.role))

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#0a1628] border-r border-[#162d58] flex flex-col z-10">
      {/* Header */}
      <div className="p-5 border-b border-[#162d58]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h1 className="text-sm font-bold text-slate-100">ROAS Calculator</h1>
            <p className="text-xs text-slate-500">Maulana Corp</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[#162d58]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-[#e85d26]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#e85d26]">
            {session.nama.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{session.nama}</p>
            <span className={session.role === 'OWNER' ? 'badge-owner' : 'badge-staff'}>
              {session.role}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary w-full text-sm py-1.5">
          Keluar
        </button>
      </div>
    </aside>
  )
}
