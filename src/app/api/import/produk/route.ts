import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessBrand, isPrivateRoomRole, requireSession } from "@/lib/session";
import { parseWorkbook } from "@/lib/import";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!isPrivateRoomRole(user)) throw new Error("FORBIDDEN");
    const form = await request.formData();
    const brandId = Number(form.get("brandId"));
    const file = form.get("file");
    if (!canAccessBrand(user, brandId)) throw new Error("FORBIDDEN");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return jsonError("File tidak valid atau > 5MB");
    const rows = parseWorkbook(await file.arrayBuffer());
    let ok = 0, skip = 0;
    for (const row of rows) {
      const nama = String(row.nama_produk || "").trim();
      const hpp = Number(row.hpp);
      if (!nama || !Number.isFinite(hpp) || hpp <= 0) { skip++; continue; }
      await prisma.produk.upsert({ where: { brandId_nama: { brandId, nama } }, update: { hpp, aktif: String(row.aktif || "true").toLowerCase() !== "false" }, create: { brandId, nama, hpp, aktif: String(row.aktif || "true").toLowerCase() !== "false" } });
      ok++;
    }
    return NextResponse.redirect(new URL(`/private-room?brandId=${brandId}&imported=${ok}&skip=${skip}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
