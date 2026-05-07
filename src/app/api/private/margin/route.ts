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
    const data = { batasBahayaPct: Number(form.get("batasBahayaPct")), batasCukupPct: Number(form.get("batasCukupPct")), labelBahaya: String(form.get("labelBahaya")), labelCukup: String(form.get("labelCukup")), labelProporsional: String(form.get("labelProporsional")) };
    await prisma.marginSetting.upsert({ where: { brandId }, update: data, create: { brandId, ...data } });
    return NextResponse.redirect(new URL(`/private-room?brandId=${brandId}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
