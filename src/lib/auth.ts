import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from './session'
import { NextResponse } from 'next/server'

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session.userId) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session, error: null }
}

export async function requireOwner() {
  const session = await getSession()
  if (!session.userId) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.role !== 'OWNER') {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, error: null }
}

export async function requireOwnerOrManager() {
  const session = await getSession()
  if (!session.userId) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.role !== 'OWNER' && session.role !== 'MANAGER') {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, error: null }
}

export function canAccessBrand(session: SessionData, brandId: number): boolean {
  if (session.role === 'OWNER') return true
  return session.brandIds.includes(brandId)
}

export function formatRupiah(angka: number | bigint): string {
  return 'Rp ' + Number(angka).toLocaleString('id-ID')
}
