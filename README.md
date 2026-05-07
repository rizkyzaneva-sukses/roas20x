# ROAS20X

Aplikasi web internal ZANEVA untuk kalkulasi ROAS bersih berbasis brand, platform, biaya admin, HPP rahasia, margin status, diskon bundling, dan user management.

## Stack

- Next.js 15 App Router
- Prisma ORM
- PostgreSQL
- iron-session
- TailwindCSS v4
- SheetJS xlsx
- Docker standalone output untuk EasyPanel

## Quick Start

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Demo login setelah seed:

- owner / password123
- manager / password123
- staff / password123

## Security Rules

- STAFF tidak menerima HPP atau biaya admin dari API kalkulasi.
- STAFF tidak bisa akses Private Room dan Rekap.
- MANAGER hanya mengelola brand yang di-assign dan tidak bisa User Management.
- Formula ROAS mengikuti PRD dan dikunci di server.

## Deploy EasyPanel

Set environment:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/roas20x?schema=public
SESSION_PASSWORD=minimal-32-karakter-random
```

Build Docker menggunakan `Dockerfile` di root project.
