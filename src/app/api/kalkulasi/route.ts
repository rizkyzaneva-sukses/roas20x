import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canAccessBrand, requireSession } from "@/lib/session";
import { calculateRoas, publicCalcPayload } from "@/lib/calc";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ brandId: z.number(), platformId: z.number(), produkIds: z.array(z.number()).min(1).max(3), hargaJual: z.number().positive() });

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = schema.parse(await request.json());
    if (!canAccessBrand(user, body.brandId)) throw new Error("FORBIDDEN");
    const [platform, products, diskon, marginSetting] = await Promise.all([
      prisma.platform.findFirst({ where: { id: body.platformId, brandId: body.brandId } }),
      prisma.produk.findMany({ where: { id: { in: body.produkIds }, brandId: body.brandId, aktif: true, hpp: { gt: 0 } } }),
      prisma.bundlingDiskon.findUnique({ where: { brandId_jumlahProduk: { brandId: body.brandId, jumlahProduk: body.produkIds.length } } }),
      prisma.marginSetting.findUnique({ where: { brandId: body.brandId } }),
    ]);
    if (!platform || products.length !== body.produkIds.length) return jsonError("Produk atau platform tidak valid");
    const result = calculateRoas({ hargaJual: body.hargaJual, adminPct: platform.adminPct, adminFlat: platform.adminFlat, hpps: products.map((p) => p.hpp), diskonBundling: diskon?.diskonRp ?? 0, marginSetting });
    const payload = publicCalcPayload(result);
    if (user.role === "STAFF") return Response.json(payload);
    return Response.json({ ...payload, harga_jual_bersih: result.hargaJualBersih, hpp_efektif: result.hppEfektif });
  } catch (error) { return handleApiError(error); }
}
