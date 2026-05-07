import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: number
  username: string
  nama: string
  role: 'OWNER' | 'MANAGER' | 'USER'
  brandIds: number[]
}

export const sessionOptions: SessionOptions = {
  cookieName: 'roas_session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
}
