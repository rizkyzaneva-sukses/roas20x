import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const user = await prisma.user.findUnique({ where: { username }, include: { brands: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }
  const session = await getSession();
  session.user = { id: user.id, nama: user.nama, username: user.username, role: user.role, brandIds: user.brands.map((b) => b.brandId) };
  await session.save();
  return NextResponse.redirect(new URL(user.role === "STAFF" ? "/dashboard" : "/private-room", request.url), 303);
}
