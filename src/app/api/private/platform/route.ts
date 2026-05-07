import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessBrand, isPrivateRoomRole, requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!isPrivateRoomRole(user)) throw new Error("FORBIDDEN");
    const form = await request.formData();
    const brandId = Number(form.get("brandId"));
    if (!canAccessBrand(user, brandId)) throw new Error("FORBIDDEN");
    const nama = String(form.get("nama")).trim();
    await prisma.platform.upsert({ where: { brandId_nama: { brandId, nama } }, update: { adminPct: Number(form.get("adminPct")), adminFlat: Number(form.get("adminFlat")) }, create: { brandId, nama, adminPct: Number(form.get("adminPct")), adminFlat: Number(form.get("adminFlat")) } });
    return NextResponse.redirect(new URL(`/private-room?brandId=${brandId}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
