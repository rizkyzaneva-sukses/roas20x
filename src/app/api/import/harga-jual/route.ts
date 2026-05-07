import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRoas } from "@/lib/calc";
import { canAccessBrand, requireSession } from "@/lib/session";
import { normalizeName, parseWorkbook } from "@/lib/import";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const form = await request.formData();
    const brandId = Number(form.get("brandId"));
    const file = form.get("file");
    if (!canAccessBrand(user, brandId)) throw new Error("FORBIDDEN");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return jsonError("File tidak valid atau > 5MB");
    const rows = parseWorkbook(await file.arrayBuffer());
    const [products, platforms, marginSetting] = await Promise.all([
      prisma.produk.findMany({ where: { brandId, aktif: true, hpp: { gt: 0 } } }),
      prisma.platform.findMany({ where: { brandId } }),
      prisma.marginSetting.findUnique({ where: { brandId } }),
    ]);
    const productMap = new Map(products.map((p) => [normalizeName(p.nama), p]));
    const platformMap = new Map(platforms.map((p) => [normalizeName(p.nama), p]));
    let ok = 0, skip = 0;
    for (const row of rows) {
      const platform = platformMap.get(normalizeName(row.platform));
      const selected = [row.produk_1, row.produk_2, row.produk_3].filter(Boolean).map((name) => productMap.get(normalizeName(name))).filter(Boolean).slice(0, 3);
      const hargaJual = Number(row.harga_jual);
      if (!platform || selected.length < 1 || !Number.isFinite(hargaJual) || hargaJual <= 0) { skip++; continue; }
      const diskon = await prisma.bundlingDiskon.findUnique({ where: { brandId_jumlahProduk: { brandId, jumlahProduk: selected.length } } });
      const result = calculateRoas({ hargaJual, adminPct: platform.adminPct, adminFlat: platform.adminFlat, hpps: selected.map((p) => p!.hpp), diskonBundling: diskon?.diskonRp ?? 0, marginSetting });
      await prisma.kalkulasiRecord.create({ data: { userId: user.id, brandId, platformId: platform.id, hargaJual, hargaJualBersih: result.hargaJualBersih, hppEfektif: result.hppEfektif, roas: result.roas, marginPct: result.marginPct, statusRoas: result.status, produkSnapshot: selected.map((p) => p!.nama).join(" + "), tanggalTransaksi: row.tanggal ? new Date(String(row.tanggal)) : new Date(), produk: { create: selected.map((p) => ({ produkId: p!.id })) } } });
      ok++;
    }
    return NextResponse.redirect(new URL(`/input-harga-jual?brandId=${brandId}&imported=${ok}&skip=${skip}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
