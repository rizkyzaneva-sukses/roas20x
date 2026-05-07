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
    await prisma.produk.upsert({ where: { brandId_nama: { brandId, nama: String(form.get("nama")).trim() } }, update: { hpp: Number(form.get("hpp")), aktif: true }, create: { brandId, nama: String(form.get("nama")).trim(), hpp: Number(form.get("hpp")), aktif: true } });
    return NextResponse.redirect(new URL(`/private-room?brandId=${brandId}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
