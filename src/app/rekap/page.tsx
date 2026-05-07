import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rupiah, tanggal } from "@/lib/format";

export default async function RekapPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (session.user.role === "STAFF") redirect("/dashboard");
  const records = await prisma.kalkulasiRecord.findMany({ where: session.user.role === "OWNER" ? {} : { brandId: { in: session.user.brandIds } }, include: { user: true, brand: true, platform: true }, orderBy: { tanggalTransaksi: "desc" }, take: 300 });
  return <><Nav /><main className="container hero grid"><section className="card"><h1>Rekap Record</h1><p className="muted">OWNER melihat semua brand. MANAGER hanya brand assign. HPP tidak ditampilkan.</p></section><section className="card table-wrap"><table><thead><tr><th>Tanggal</th><th>User</th><th>Brand</th><th>Platform</th><th>Produk</th><th>Harga Jual</th><th>ROAS</th><th>Status</th></tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{tanggal(r.tanggalTransaksi)}</td><td>{r.user.nama}</td><td>{r.brand.nama}</td><td>{r.platform.nama}</td><td>{r.produkSnapshot}</td><td>{rupiah(r.hargaJual)}</td><td>{r.roas.toFixed(3)}</td><td><StatusBadge status={r.statusRoas} /></td></tr>)}</tbody></table></section></main></>;
}
