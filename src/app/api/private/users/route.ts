import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (user.role !== "OWNER") throw new Error("FORBIDDEN");
    const form = await request.formData();
    const brandIds = form.getAll("brandIds").map(Number).filter(Boolean);
    await prisma.user.create({ data: { nama: String(form.get("nama")), username: String(form.get("username")), passwordHash: await bcrypt.hash(String(form.get("password")), 10), role: String(form.get("role")) as Role, brands: { create: brandIds.map((brandId) => ({ brandId })) } } });
    return NextResponse.redirect(new URL("/private-room", request.url), 303);
  } catch (error) { return handleApiError(error); }
}
