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
    for (const jumlahProduk of [1, 2, 3]) {
      await prisma.bundlingDiskon.upsert({ where: { brandId_jumlahProduk: { brandId, jumlahProduk } }, update: { diskonRp: Number(form.get(`diskon${jumlahProduk}`)) }, create: { brandId, jumlahProduk, diskonRp: Number(form.get(`diskon${jumlahProduk}`)) } });
    }
    return NextResponse.redirect(new URL(`/private-room?brandId=${brandId}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
