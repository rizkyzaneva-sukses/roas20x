import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { BrandSelect } from "@/components/BrandSelect";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { roasMinimum } from "@/lib/calc";
import { rupiah } from "@/lib/format";

export default async function PrivateRoomPage({ searchParams }: { searchParams: Promise<{ brandId?: string }> }) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (session.user.role === "STAFF") redirect("/dashboard");
  const params = await searchParams;
  const brands = await prisma.brand.findMany({ where: session.user.role === "OWNER" ? {} : { id: { in: session.user.brandIds } }, orderBy: { nama: "asc" } });
  const brandId = Number(params.brandId || brands[0]?.id);
  const [products, platforms, bundlings, margin, users] = await Promise.all([
    prisma.produk.findMany({ where: { brandId }, orderBy: { nama: "asc" } }),
    prisma.platform.findMany({ where: { brandId }, orderBy: { nama: "asc" } }),
    prisma.bundlingDiskon.findMany({ where: { brandId }, orderBy: { jumlahProduk: "asc" } }),
    prisma.marginSetting.findUnique({ where: { brandId } }),
    session.user.role === "OWNER" ? prisma.user.findMany({ include: { brands: { include: { brand: true } } }, orderBy: { id: "asc" } }) : Promise.resolve([]),
  ]);
  return <><Nav /><main className="container hero grid">
    <section className="card"><h1>Private Room</h1><p className="muted">Area rahasia untuk HPP, platform, margin, diskon bundling, dan user management.</p><form><BrandSelect brands={brands} defaultValue={brandId} /><button className="btn secondary" style={{ marginTop: 10 }}>Pilih Brand</button></form></section>
    <section className="grid grid-2">
      <div className="card grid"><h2>Produk & HPP</h2><form action="/api/private/produk" method="post" className="grid"><input type="hidden" name="brandId" value={brandId}/><input className="input" name="nama" placeholder="Nama produk" required/><input className="input" name="hpp" type="number" placeholder="HPP" required/><button className="btn">Tambah / Update Produk</button></form><a className="btn secondary" href="/api/templates/produk">Download Template Produk</a><form className="grid" action="/api/import/produk" method="post" encType="multipart/form-data"><input type="hidden" name="brandId" value={brandId}/><input className="input" type="file" name="file" accept=".csv,.xlsx" required/><button className="btn secondary">Import Produk</button></form><div className="table-wrap"><table><thead><tr><th>Nama</th><th>HPP</th><th>Aktif</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td>{p.nama}</td><td>{rupiah(p.hpp)}</td><td>{p.aktif ? "Ya" : "Tidak"}</td></tr>)}</tbody></table></div></div>
      <div className="card grid"><h2>Platform & Biaya Admin</h2><form action="/api/private/platform" method="post" className="grid"><input type="hidden" name="brandId" value={brandId}/><input className="input" name="nama" placeholder="Nama platform" required/><input className="input" name="adminPct" type="number" step="0.01" placeholder="Admin %" required/><input className="input" name="adminFlat" type="number" placeholder="Admin Flat" required/><button className="btn">Tambah Platform</button></form><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Admin %</th><th>Flat</th></tr></thead><tbody>{platforms.map((p) => <tr key={p.id}><td>{p.nama}</td><td>{p.adminPct}%</td><td>{rupiah(p.adminFlat)}</td></tr>)}</tbody></table></div></div>
      <div className="card grid"><h2>Setting Margin & Status</h2><form action="/api/private/margin" method="post" className="grid"><input type="hidden" name="brandId" value={brandId}/><input className="input" name="batasBahayaPct" type="number" step="0.01" defaultValue={margin?.batasBahayaPct ?? 5}/><input className="input" name="batasCukupPct" type="number" step="0.01" defaultValue={margin?.batasCukupPct ?? 10}/><input className="input" name="labelBahaya" defaultValue={margin?.labelBahaya ?? "Bahaya"}/><input className="input" name="labelCukup" defaultValue={margin?.labelCukup ?? "Cukup"}/><input className="input" name="labelProporsional" defaultValue={margin?.labelProporsional ?? "Proporsional"}/><button className="btn">Simpan Margin</button></form><p className="muted">Preview ROAS minimum: Bahaya {roasMinimum(margin?.batasBahayaPct ?? 5).toFixed(3)} · Cukup {roasMinimum(margin?.batasCukupPct ?? 10).toFixed(3)}</p></div>
      <div className="card grid"><h2>Diskon Bundling</h2><form action="/api/private/bundling" method="post" className="grid"><input type="hidden" name="brandId" value={brandId}/>{[1,2,3].map((n) => <label key={n}>Diskon {n} produk<input className="input" name={`diskon${n}`} type="number" defaultValue={bundlings.find((b) => b.jumlahProduk === n)?.diskonRp ?? (n === 1 ? 0 : n === 2 ? 5000 : 10000)} /></label>)}<button className="btn">Simpan Diskon</button></form></div>
    </section>
    {session.user.role === "OWNER" && <section className="card grid"><h2>User Management</h2><form className="grid grid-3" action="/api/private/users" method="post"><input className="input" name="nama" placeholder="Nama" required/><input className="input" name="username" placeholder="Username" required/><input className="input" name="password" placeholder="Password" required/><select className="input" name="role"><option>STAFF</option><option>MANAGER</option><option>OWNER</option></select><select className="input" name="brandIds" multiple>{brands.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}</select><button className="btn">Tambah User</button></form><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Brand</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td>{u.nama}</td><td>{u.username}</td><td>{u.role}</td><td>{u.brands.map((b) => b.brand.nama).join(", ")}</td></tr>)}</tbody></table></div></section>}
  </main></>;
}
