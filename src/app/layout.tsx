import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROAS Calculator',
  description: 'Hitung minimum ROAS iklan marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-navy-950 text-slate-100 min-h-screen font-mono antialiased">
        {children}
      </body>
    </html>
  )
}
