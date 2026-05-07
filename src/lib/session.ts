import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: number
  username: string
  nama: string
  role: 'OWNER' | 'MANAGER' | 'USER'
  brandIds: number[]
}

const DEFAULT_SESSION_SECRET = 'roas20x-dev-session-secret-change-me-32chars'
const MIN_SESSION_SECRET_LENGTH = 32

function getValidSessionSecret(): string {
  const candidates = [process.env.SESSION_PASSWORD, process.env.SESSION_SECRET]

  return (
    candidates
      .map((value) => value?.trim() ?? '')
      .find((value) => value.length >= MIN_SESSION_SECRET_LENGTH) || DEFAULT_SESSION_SECRET
  )
}

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: 'roas_session',
    password: getValidSessionSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    },
  }
}

export const sessionOptions: SessionOptions = getSessionOptions()
