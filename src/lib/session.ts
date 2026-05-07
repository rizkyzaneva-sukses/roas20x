import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  nama: string;
  username: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  brandIds: number[];
};

export type SessionData = {
  user?: SessionUser;
};

export const sessionOptions: SessionOptions = {
  cookieName: "roas20x_session",
  password: process.env.SESSION_PASSWORD || "dev-password-change-me-please-32-chars",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.user) throw new Error("UNAUTHORIZED");
  return session.user;
}

export function canAccessBrand(user: SessionUser, brandId: number) {
  return user.role === "OWNER" || user.brandIds.includes(brandId);
}

export function isPrivateRoomRole(user: SessionUser) {
  return user.role === "OWNER" || user.role === "MANAGER";
}
