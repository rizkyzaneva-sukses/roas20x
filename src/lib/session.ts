import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: number
  username: string
  nama: string
  role: 'OWNER' | 'MANAGER' | 'USER'
  brandIds: number[]
}

const DEFAULT_SESSION_SECRET = 'roas20x-dev-session-secret-change-me-32chars'

export function getSessionOptions(): SessionOptions {
  const password =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SESSION_PASSWORD?.trim() ||
    DEFAULT_SESSION_SECRET

  return {
    cookieName: 'roas_session',
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    },
  }
}

export const sessionOptions: SessionOptions = getSessionOptions()
