import { getSession } from '@/lib/auth'

export default async function PanduanPage() {
  const session = await getSession()
  const role = session.role as 'OWNER' | 'MANAGER' | 'USER'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">📖 Panduan Penggunaan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Panduan lengkap ROAS Calculator — Role kamu: <span className={role === 'OWNER' ? 'badge-owner' : role === 'MANAGER' ? 'badge-manager' : 'badge-staff'}>{role}</span>
        </p>
      </div>

      {/* === SECTION: Kalkulator ROAS (ALL ROLES) === */}
      <section className="card space-y-4">
        <h2 className="text-lg font-bold text-[#e85d26]">📊 Kalkulator ROAS</h2>
        <p className="text-slate-300 text-sm">Fitur utama untuk menghitung minimum ROAS per produk/bundle.</p>
        <div className="space-y-3 text-sm text-slate-400">
          <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-200">Cara Menggunakan:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Buka menu <strong className="text-slate-200">Kalkulator ROAS</strong> di sidebar</li>
              <li>Pilih <strong className="text-slate-200">Brand</strong> dari dropdown</li>
              <li>Pilih <strong className="text-slate-200">Produk</strong> atau <strong className="text-slate-200">Bundle</strong></li>
              <li>Harga jual & fee otomatis terisi (bisa diedit manual)</li>
              <li>Masukkan <strong className="text-slate-200">ROAS Aktual</strong> (opsional) untuk melihat status profit</li>
              <li>Klik <strong className="text-slate-200">Hitung</strong> → muncul tabel ROAS per tier</li>
            </ol>
          </div>
          <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-200">Memahami Hasil:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-emerald-400 font-bold">Harga Bersih</span> — Harga jual setelah dipotong biaya admin (fee platform)</li>
              <li><span className="text-red-400 font-bold">❌ Rugi</span> — ROAS aktual di bawah DANGER (titik balik modal)</li>
              <li><span className="text-yellow-400 font-bold">⚠️ Tipis</span> — ROAS aktual mendekati DANGER (margin tipis)</li>
              <li><span className="text-green-400 font-bold">✅ Profit</span> — ROAS aktual di atas target margin</li>
            </ul>
          </div>
          <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-200">Tier ROAS (default):</p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-300 border-b border-[#162d58]">
                  <th className="py-1">Tier</th>
                  <th className="py-1">Target Margin</th>
                  <th className="py-1">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-1">DANGER</td><td>0%</td><td>Break Even Point (balik modal)</td></tr>
                <tr><td className="py-1">Hati Hati</td><td>5%</td><td>Profit minimal</td></tr>
                <tr><td className="py-1">Good</td><td>15%</td><td>Profit standar</td></tr>
                <tr><td className="py-1">GAS MAKSIMAL</td><td>25%</td><td>Profit ideal</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* === SECTION: Dashboard (ALL ROLES) === */}
      <section className="card space-y-4">
        <h2 className="text-lg font-bold text-[#e85d26]">🏠 Dashboard</h2>
        <p className="text-slate-300 text-sm">Ringkasan brand, produk, dan akses cepat ke kalkulator.</p>
        <div className="bg-[#0f2040] rounded-lg p-4 space-y-2 text-sm text-slate-400">
          <ul className="list-disc list-inside space-y-1">
            <li>Melihat jumlah brand aktif yang kamu akses</li>
            <li>Melihat total produk yang sudah diinput</li>
            <li>Shortcut langsung ke Kalkulator ROAS</li>
            {role === 'OWNER' && <li>Melihat jumlah user aktif di sistem</li>}
          </ul>
        </div>
      </section>

      {/* === SECTION: Manajemen Brand (OWNER & MANAGER) === */}
      {(role === 'OWNER' || role === 'MANAGER') && (
        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-[#e85d26]">🏷️ Manajemen Brand</h2>
          <p className="text-slate-300 text-sm">Kelola brand, produk, bundle, tier, dan assign user.</p>

          <div className="space-y-3 text-sm text-slate-400">
            {/* Add Product */}
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">➕ Tambah Produk Manual:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <strong className="text-slate-200">Manajemen Brand</strong></li>
                <li>Klik salah satu brand</li>
                <li>Klik tombol <strong className="text-slate-200">+ Produk</strong></li>
                <li>Isi: Nama Produk, HPP (Harga Pokok), Harga Jual Default</li>
                <li>Klik Simpan</li>
              </ol>
            </div>

            {/* Import */}
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">📥 Import Produk dari File (CSV/Excel):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <strong className="text-slate-200">Manajemen Brand</strong> → pilih brand</li>
                <li>Klik tombol <strong className="text-slate-200">Import</strong></li>
                <li>Upload file <strong className="text-slate-200">.csv</strong>, <strong className="text-slate-200">.xls</strong>, atau <strong className="text-slate-200">.xlsx</strong></li>
                <li>Sistem otomatis membaca kolom dan mengimport</li>
              </ol>
              <div className="mt-3 p-3 bg-[#060d1f] rounded border border-[#162d58]">
                <p className="font-semibold text-slate-300 mb-2">Format Kolom File Import:</p>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-300 border-b border-[#162d58]">
                      <th className="py-1 pr-4">Kolom</th>
                      <th className="py-1">Nama yang Diterima</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    <tr><td className="py-1 pr-4 font-medium">Nama Produk</td><td>nama, namaproduk, produk, name</td></tr>
                    <tr><td className="py-1 pr-4 font-medium">HPP</td><td>hpp, hargapokok, costprice, cost</td></tr>
                    <tr><td className="py-1 pr-4 font-medium">Harga Jual</td><td>hargajual, hargajualdefault, harga, price, sellingprice</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 p-3 bg-[#060d1f] rounded border border-[#162d58]">
                <p className="font-semibold text-slate-300 mb-1">Contoh CSV:</p>
                <code className="text-xs text-green-400 block whitespace-pre">nama,hpp,hargajual{'\n'}Gamis Zaneva A,85000,189000{'\n'}Hijab Premium B,45000,99000</code>
              </div>
            </div>

            {/* Bundle */}
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">📦 Membuat Bundle:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka brand → klik <strong className="text-slate-200">+ Bundle</strong></li>
                <li>Isi nama bundle dan harga jual bundle</li>
                <li>Pilih produk-produk yang masuk bundle beserta qty</li>
                <li>HPP bundle = total HPP semua item × qty</li>
              </ol>
            </div>

            {/* Tier */}
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">📐 Edit Tier ROAS per Brand:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka brand → bagian <strong className="text-slate-200">Tier ROAS</strong></li>
                <li>Klik <strong className="text-slate-200">Edit Tier</strong></li>
                <li>Tambah/hapus/ubah label dan target margin (%)</li>
                <li>Klik Simpan</li>
              </ol>
            </div>

            {/* Fee */}
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">💰 Edit Fee Default:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka brand → klik angka fee di samping nama brand</li>
                <li>Ubah persentase fee marketplace (default 18%)</li>
                <li>Klik Simpan</li>
              </ol>
            </div>

            {/* Assign User */}
            {role === 'OWNER' && (
              <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-200">👤 Assign User ke Brand:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Buka brand → klik <strong className="text-slate-200">Assign User</strong></li>
                  <li>Centang/uncentang user yang boleh akses brand ini</li>
                  <li>User dengan role USER hanya bisa lihat brand yang di-assign</li>
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === SECTION: Manajemen User (OWNER ONLY) === */}
      {role === 'OWNER' && (
        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-[#e85d26]">👥 Manajemen User</h2>
          <p className="text-slate-300 text-sm">Kelola user yang bisa mengakses sistem.</p>

          <div className="space-y-3 text-sm text-slate-400">
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">Tambah User Baru:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <strong className="text-slate-200">Manajemen User</strong></li>
                <li>Klik <strong className="text-slate-200">+ Tambah User</strong></li>
                <li>Isi: Nama, Username, Password, Role</li>
                <li>Klik Simpan</li>
              </ol>
            </div>

            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">Role & Hak Akses:</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-300 border-b border-[#162d58]">
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2">Hak Akses</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#162d58]/50">
                    <td className="py-2 pr-4"><span className="badge-owner">OWNER</span></td>
                    <td className="py-2">Semua fitur: Kalkulator, Dashboard, Manajemen Brand, Manajemen User, Import, Assign</td>
                  </tr>
                  <tr className="border-b border-[#162d58]/50">
                    <td className="py-2 pr-4"><span className="badge-manager">MANAGER</span></td>
                    <td className="py-2">Kalkulator, Dashboard, Manajemen Brand (produk, bundle, tier, fee)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4"><span className="badge-staff">USER</span></td>
                    <td className="py-2">Kalkulator & Dashboard (hanya brand yang di-assign)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#0f2040] rounded-lg p-4 space-y-2">
              <p className="font-semibold text-slate-200">Edit / Hapus User:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Klik user di daftar → Edit nama, role, atau reset password</li>
                <li>Klik tombol hapus untuk menonaktifkan user</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* === SECTION: Biaya Admin / Fee === */}
      {(role === 'OWNER' || role === 'MANAGER') && (
        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-[#e85d26]">💰 Biaya Admin (Fee Platform)</h2>
          <p className="text-slate-300 text-sm">Penjelasan bagaimana biaya admin masuk ke perhitungan ROAS.</p>

          <div className="space-y-3 text-sm text-slate-400">
            <div className="bg-[#0f2040] rounded-lg p-4 space-y-3">
              <p className="font-semibold text-slate-200">Apa itu Biaya Admin?</p>
              <p>Biaya admin adalah <strong className="text-slate-200">fee yang dipotong marketplace</strong> (Shopee, Tokopedia, dll) dari setiap penjualan. Biasanya berkisar <strong className="text-slate-200">15-20%</strong> dari harga jual.</p>
            </div>

            <div className="bg-[#0f2040] rounded-lg p-4 space-y-3">
              <p className="font-semibold text-slate-200">Bagaimana Biaya Admin Masuk Perhitungan?</p>
              <p>Biaya admin digunakan untuk menghitung <strong className="text-slate-200">Net Revenue</strong> (pendapatan bersih):</p>
              <div className="bg-[#060d1f] rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                <p>Net Revenue = Harga Jual × (1 - Fee/100)</p>
                <p>Gross Profit = Net Revenue - HPP</p>
                <p>Gross Margin = Gross Profit / Harga Jual × 100%</p>
              </div>
              <p className="mt-2">Contoh: Harga Jual Rp 200.000, Fee 18%, HPP Rp 80.000</p>
              <div className="bg-[#060d1f] rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1">
                <p>Net Revenue = 200.000 × (1 - 18/100) = <span className="text-green-400">Rp 164.000</span></p>
                <p>Gross Profit = 164.000 - 80.000 = <span className="text-green-400">Rp 84.000</span></p>
                <p>Gross Margin = 84.000 / 200.000 × 100% = <span className="text-green-400">42%</span></p>
              </div>
            </div>

            <div className="bg-[#0f2040] rounded-lg p-4 space-y-3">
              <p className="font-semibold text-slate-200">Rumus ROAS Minimal:</p>
              <div className="bg-[#060d1f] rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                <p>ROAS Minimal = Harga Jual / (Gross Profit - Target Profit)</p>
                <p>Target Profit = Harga Jual × (Target Margin / 100)</p>
              </div>
              <p className="mt-2">Artinya: semakin tinggi fee admin, semakin tinggi ROAS yang dibutuhkan untuk profit.</p>
            </div>

            <div className="bg-[#0f2040] rounded-lg p-4 space-y-3">
              <p className="font-semibold text-slate-200">Cara Set Biaya Admin:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <strong className="text-slate-200">Manajemen Brand</strong></li>
                <li>Pilih brand → klik ✏️ di samping angka fee</li>
                <li>Ubah persentase sesuai fee marketplace kamu</li>
                <li>Fee ini otomatis dipakai di Kalkulator ROAS</li>
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* === SECTION: Tips === */}
      <section className="card space-y-4">
        <h2 className="text-lg font-bold text-[#e85d26]">💡 Tips</h2>
        <div className="bg-[#0f2040] rounded-lg p-4 space-y-2 text-sm text-slate-400">
          <ul className="list-disc list-inside space-y-2">
            <li>Gunakan <strong className="text-slate-200">Import Excel</strong> untuk input produk massal — lebih cepat dari manual</li>
            <li>Set <strong className="text-slate-200">Tier ROAS</strong> per brand sesuai target bisnis masing-masing</li>
            <li>Fee default = fee marketplace (Shopee/Tokopedia biasanya 15-20%)</li>
            <li>ROAS DANGER = titik balik modal. Di bawah itu = <span className="text-red-400">RUGI</span></li>
            <li>Kalkulator bisa hitung banyak produk sekaligus — tambah baris dengan tombol +</li>
            <li>Gunakan <strong className="text-slate-200">Export CSV</strong> di Manajemen Brand untuk melihat semua produk</li>
            <li>Gunakan <strong className="text-slate-200">Edit Masal</strong> untuk update banyak produk sekaligus via file</li>
            {(role === 'OWNER' || role === 'MANAGER') && (
              <li>Bundle berguna untuk paket produk — HPP otomatis dihitung dari total item</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}
