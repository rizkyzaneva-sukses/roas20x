import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { BrandSelect } from "@/components/BrandSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rupiah, tanggal } from "@/lib/format";

export default async function InputHargaJualPage({ searchParams }: { searchParams: Promise<{ brandId?: string; produkId?: string }> }) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const params = await searchParams;
  const brands = await prisma.brand.findMany({ where: session.user.role === "OWNER" ? {} : { id: { in: session.user.brandIds } }, orderBy: { nama: "asc" } });
  const brandId = Number(params.brandId || brands[0]?.id);
  const [products, platforms, records] = await Promise.all([
    prisma.produk.findMany({ where: { brandId, aktif: true, hpp: { gt: 0 } }, orderBy: { nama: "asc" } }),
    prisma.platform.findMany({ where: { brandId }, orderBy: { nama: "asc" } }),
    prisma.kalkulasiRecord.findMany({ where: { userId: session.user.id }, include: { platform: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return <><Nav /><main className="container hero grid">
    <section className="card"><h1>Input Harga Jual</h1><p className="muted">Generate ROAS di server. Response staff tidak berisi HPP atau biaya admin.</p></section>
    <section className="grid grid-2">
      <form className="card grid" action="/api/kalkulasi/simpan" method="post">
        <label>Brand<BrandSelect brands={brands} defaultValue={brandId} /></label>
        <label>Platform<select className="input" name="platformId" required>{platforms.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
        {[1,2,3].map((n) => <label key={n}>Produk {n}{n === 1 ? " (wajib)" : " (opsional)"}<select className="input" name={`produk${n}`} required={n === 1} defaultValue={n === 1 ? params.produkId : ""}><option value="">-</option>{products.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>)}
        <label>Harga Jual Total<input className="input" name="hargaJual" type="number" min="1" required /></label>
        <label>Tanggal<input className="input" name="tanggal" type="date" /></label>
        <button className="btn" type="submit" disabled={!platforms.length || !products.length}>Generate ROAS & Simpan</button>
        {!platforms.length && <p className="badge-warning">Brand belum punya platform. Hubungi Manager.</p>}
      </form>
      <div className="card grid">
        <h2>Import Harga Jual</h2><p className="muted">CSV/XLSX: produk_1, harga_jual, platform, produk_2, produk_3, tanggal.</p>
        <a className="btn secondary" href="/api/templates/harga-jual">Download Template</a>
        <form className="grid" action="/api/import/harga-jual" method="post" encType="multipart/form-data">
          <input type="hidden" name="brandId" value={brandId} /><input className="input" type="file" name="file" accept=".csv,.xlsx" required />
          <button className="btn" type="submit">Preview & Simpan Valid</button>
        </form>
      </div>
    </section>
    <section className="card table-wrap"><h2>Record Tersimpan</h2><table><thead><tr><th>Tanggal</th><th>Platform</th><th>Produk</th><th>Harga Jual</th><th>ROAS</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{tanggal(r.tanggalTransaksi)}</td><td>{r.platform.nama}</td><td>{r.produkSnapshot}</td><td>{rupiah(r.hargaJual)}</td><td>{r.roas.toFixed(3)}</td><td><StatusBadge status={r.statusRoas} /></td><td><form action={`/api/kalkulasi/${r.id}/hapus`} method="post"><button className="btn danger">Hapus</button></form></td></tr>)}</tbody></table></section>
  </main></>;
}
