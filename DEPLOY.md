# Deploy Guide — ROAS Calculator
## roas20x.maulanacorp.my.id

---

## 1. Push ke GitHub

```bash
cd roas-calculator
git init
git add .
git commit -m "feat: initial ROAS Calculator"
git remote add origin https://github.com/rizkyzaneva-sukses/roas-calculator.git
git push -u origin main
```

---

## 2. Setup di EasyPanel

### A. Buat Service App (dari GitHub)
1. EasyPanel → **New Service → App**
2. Source: GitHub → repo `roas-calculator`
3. Build: **Dockerfile**
4. Domain: `roas20x.maulanacorp.my.id`
5. Port: `3000`

### B. Buat Service Database PostgreSQL
1. EasyPanel → **New Service → PostgreSQL**
2. Nama: `roas-db`
3. Catat: host, port, user, password, dbname

### C. Set Environment Variables di App Service
```
DATABASE_URL=postgresql://USER:PASS@roas-db:5432/DBNAME
SESSION_SECRET=<generate dengan: openssl rand -base64 32>
NODE_ENV=production
```

---

## 3. Migrasi & Seed Database

Setelah deploy pertama berhasil, jalankan via EasyPanel Terminal:

```bash
# Masuk ke container app
npx prisma migrate deploy
npx prisma db seed
```

Atau via EasyPanel → Service → Terminal:
```bash
node -e "
const { execSync } = require('child_process');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
"
```

---

## 4. Cloudflare DNS

Tambah record di Cloudflare:
```
Type: A
Name: roas20x
Value: 43.173.30.67  (IP VPS Tencent Cloud Jakarta)
Proxy: ON (orange cloud)
```

---

## 5. Login Pertama

```
URL: https://roas20x.maulanacorp.my.id
Username: rizky
Password: admin123
```

⚠️ **SEGERA GANTI PASSWORD** setelah login pertama!
Pergi ke Manajemen User → Edit → set password baru.

---

## 6. Setup Awal Data

1. Login sebagai rizky (OWNER)
2. Buka **Manajemen Brand** → brand sudah terseed: Zaneva, Oberbe, Muswim, Be.Syari, Elyasr
3. Per brand: klik → **+ Produk** → isi Nama, HPP (bisa HPP markup), Harga Jual Default
4. Buka **Manajemen User** → **+ Tambah User** untuk tim
5. Kembali ke Brand → **Assign User** ke brand masing-masing
6. Tim bisa langsung login dan pakai Kalkulator ROAS

---

## Tech Stack
- Next.js 15 + TypeScript
- PostgreSQL + Prisma ORM
- iron-session (auth)
- Tailwind CSS (dark navy theme)
- Docker + EasyPanel
