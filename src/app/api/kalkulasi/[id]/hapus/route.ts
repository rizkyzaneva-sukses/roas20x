import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const id = Number((await params).id);
    const record = await prisma.kalkulasiRecord.findUniqueOrThrow({ where: { id } });
    if (record.userId !== user.id && user.role === "STAFF") throw new Error("FORBIDDEN");
    if (user.role === "MANAGER" && !user.brandIds.includes(record.brandId)) throw new Error("FORBIDDEN");
    await prisma.kalkulasiRecord.delete({ where: { id } });
    return NextResponse.redirect(new URL("/input-harga-jual", request.url), 303);
  } catch (error) { return handleApiError(error); }
}
