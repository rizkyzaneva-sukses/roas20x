import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessBrand, requireSession } from "@/lib/session";
import { calculateRoas } from "@/lib/calc";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const form = await request.formData();
    const brandId = Number(form.get("brandId"));
    const platformId = Number(form.get("platformId"));
    const hargaJual = Number(form.get("hargaJual"));
    const produkIds = [form.get("produk1"), form.get("produk2"), form.get("produk3")].map(Number).filter(Boolean).slice(0, 3);
    if (!brandId || !platformId || !hargaJual || produkIds.length < 1 || !canAccessBrand(user, brandId)) throw new Error("FORBIDDEN");
    const [platform, products, diskon, marginSetting] = await Promise.all([
      prisma.platform.findFirstOrThrow({ where: { id: platformId, brandId } }),
      prisma.produk.findMany({ where: { id: { in: produkIds }, brandId, aktif: true, hpp: { gt: 0 } }, orderBy: { id: "asc" } }),
      prisma.bundlingDiskon.findUnique({ where: { brandId_jumlahProduk: { brandId, jumlahProduk: produkIds.length } } }),
      prisma.marginSetting.findUnique({ where: { brandId } }),
    ]);
    if (products.length !== produkIds.length) throw new Error("FORBIDDEN");
    const result = calculateRoas({ hargaJual, adminPct: platform.adminPct, adminFlat: platform.adminFlat, hpps: products.map((p) => p.hpp), diskonBundling: diskon?.diskonRp ?? 0, marginSetting });
    const record = await prisma.kalkulasiRecord.create({
      data: { userId: user.id, brandId, platformId, hargaJual, hargaJualBersih: result.hargaJualBersih, hppEfektif: result.hppEfektif, roas: result.roas, marginPct: result.marginPct, statusRoas: result.status, produkSnapshot: products.map((p) => p.nama).join(" + "), tanggalTransaksi: form.get("tanggal") ? new Date(String(form.get("tanggal"))) : new Date(), produk: { create: products.map((p) => ({ produkId: p.id })) } }
    });
    return NextResponse.redirect(new URL(`/input-harga-jual?saved=${record.id}&brandId=${brandId}`, request.url), 303);
  } catch (error) { return handleApiError(error); }
}
