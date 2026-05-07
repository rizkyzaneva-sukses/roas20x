import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { tanggal } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const q = (await searchParams).q || "";
  const brandFilter = session.user.role === "OWNER" ? {} : { id: { in: session.user.brandIds } };
  const products = await prisma.produk.findMany({
    where: { aktif: true, hpp: { gt: 0 }, brand: brandFilter, nama: { contains: q, mode: "insensitive" } },
    include: { brand: true, kalkulasiProduk: { include: { kalkulasi: { include: { platform: true }, orderBy: { createdAt: "desc" } } }, take: 1 } },
    orderBy: [{ brandId: "asc" }, { nama: "asc" }],
    take: 150,
  });
  return (
    <><Nav /><main className="container hero grid">
      <section className="card">
        <h1>Dashboard User</h1><p className="muted">Tabel referensi produk dan status ROAS terakhir. HPP disembunyikan.</p>
        <form><input className="input" name="q" defaultValue={q} placeholder="Cari nama produk..." /></form>
      </section>
      <section className="card table-wrap">
        <table><thead><tr><th>Brand</th><th>Nama Produk</th><th>Platform Terakhir</th><th>ROAS Terakhir</th><th>Status Terakhir</th><th>Tanggal</th></tr></thead>
          <tbody>{products.map((product) => {
            const last = product.kalkulasiProduk[0]?.kalkulasi;
            return <tr key={product.id}>
              <td>{product.brand.nama}</td><td><Link href={`/input-harga-jual?produkId=${product.id}&brandId=${product.brandId}`}><b>{product.nama}</b></Link></td>
              <td>{last?.platform.nama ?? "-"}</td><td>{last ? last.roas.toFixed(3) : "-"}</td><td><StatusBadge status={last?.statusRoas} /></td><td>{last ? tanggal(last.tanggalTransaksi) : "-"}</td>
            </tr>})}</tbody></table>
      </section>
    </main></>
  );
}
