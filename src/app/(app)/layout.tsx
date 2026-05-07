import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar session={{ nama: session.nama, role: session.role }} />
      <main className="flex-1 ml-60 p-6 min-h-screen">
        {children}
      </main>
    </div>
  )
}
