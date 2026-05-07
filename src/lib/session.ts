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

const DEFAULT_SESSION_PASSWORD = "roas20x-dev-session-password-change-me-32chars";

export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_PASSWORD?.trim() || DEFAULT_SESSION_PASSWORD;

  return {
    cookieName: "roas20x_session",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
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
